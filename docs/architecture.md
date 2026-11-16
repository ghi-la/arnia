# Architecture overview

See `docs/PLAN.md` for the full execution plan and pinned dependency versions; this document
covers how the pieces fit together at runtime.

## Runtime

Arnia is a single SvelteKit app deployed on **Vercel** (`@sveltejs/adapter-vercel`, Node.js
serverless functions). It's stateless: every request may run in a fresh function instance.
Its state lives in managed services:

- **MongoDB Atlas**: all data (`src/lib/server/db`). One `MongoClient` is created lazily and
  cached on `globalThis`, so warm function instances reuse their connection pool.
- **Cloudflare R2**: item photo bytes (`src/lib/server/storage`).
- **Resend / SMTP**: transactional email, sent directly during the request (there's no
  background worker on Vercel; schedules will use Vercel Cron when they're needed).

There are no migrations. Collections are created by the first write, and indexes are ensured
once per cold start (`ensureIndexes` in `db/index.ts`). That runs in the background, so code
must not rely on a unique index alone for correctness (see the role-name check in
`settings/roles`).

## Request flow

```
Browser → Vercel (TLS, function) → SvelteKit
             ├─ hooks.server.ts: i18n (Paraglide) → session (Better Auth on Mongo) → security headers
             ├─ +page.server.ts / +server.ts → src/lib/server/services/*
             │                                    ├─ src/lib/server/db (MongoDB driver)
             │                                    └─ src/lib/server/storage (R2, S3 API)
             └─ /attachments/[id] → permission check → stream from R2
```

Business logic lives in `src/lib/server/services/`, not in routes. Routes are thin: they parse
input (Zod), call a service, and shape the response. This keeps logic testable with Vitest
without spinning up SvelteKit's routing, and keeps the permission check
(`requirePermission()`, added in Phase 2) in one place per action rather than scattered across
UI conditionals.

## Data flow for a typical mutation

Multi-document writes run inside a single MongoDB transaction (`withTransaction` in
`db/index.ts`; Atlas clusters are replica sets, so transactions are always available). Where a
mutation should be audited or trigger notifications, the service appends a document to the
`activity_event` outbox collection in the same transaction — the audit log and the notification system
both read from that outbox, rather than each mutation having to know about both concerns
directly.

## Frontend

SvelteKit's server-side rendering is the default; interactivity is layered on with Svelte 5
runes and progressive enhancement (`use:enhance` on forms) rather than a client-heavy SPA
architecture. The `(app)` route group renders the authenticated shell (bottom nav on mobile,
sidebar on desktop — `src/routes/(app)/+layout.svelte`); `(auth)` renders unauthenticated flows
(login, setup wizard, password reset) with a minimal centered layout.

i18n (Paraglide) and theming (light/dark via `mode-watcher`, a `.dark` class on `<html>`) are
both resolved server-side before first paint where possible — see `CLAUDE.md` for the CSP/nonce
mechanics that make that work under a strict Content-Security-Policy.

## Storage

Uploaded files (receipts, item photos, logos) live in a private Cloudflare R2 bucket
(`src/lib/server/storage/r2.ts`), keyed `{year}/{entityType}/{id}.{ext}`, and are only ever
served through an authorized SvelteKit route (`/attachments/[id]`, which streams from R2) —
never from a public bucket URL — so permission checks apply to file access the same way they
apply to data access. Setup: `docs/storage-r2.md`.

## See also

- `docs/data-model.md` — entity-relationship diagram.
- `docs/PLAN.md` — phase plan, dependency versions, full schema draft, and the "Notes /
  decisions log" for non-obvious choices (e.g. why CSP is configured where it is).

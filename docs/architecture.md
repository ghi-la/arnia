# Architecture overview

See `docs/PLAN.md` for the full execution plan and pinned dependency versions; this document
covers how the pieces fit together at runtime.

## Processes

Arnia runs as two Node.js processes sharing one codebase and Docker image:

- **`app`** — the SvelteKit server (`build/index.js`, `@sveltejs/adapter-node`). Handles HTTP
  requests: page rendering, form actions, API endpoints, auth. Stateless — safe to scale
  horizontally behind Caddy.
- **`worker`** (`src/worker.ts`) — a pg-boss worker process. Handles anything that shouldn't
  block a request: sending email, polling IMAP, generating PDFs, reminders, digests, cleanup
  jobs. pg-boss uses Postgres itself as the queue, so no Redis or separate broker is needed.

Both processes run the same migration runner (`src/lib/server/db/migrate.ts`) on startup,
guarded by a Postgres advisory lock, so it's safe for them (or multiple replicas of `app`) to
start concurrently — only one actually runs the migration, the rest wait and then proceed.

Caddy sits in front of `app` as a reverse proxy and handles TLS termination and certificate
renewal automatically (see the root `Caddyfile`).

## Request flow

```
Browser → Caddy (TLS) → app (SvelteKit)
                            ├─ hooks.server.ts: i18n (Paraglide) → security headers
                            ├─ +page.server.ts / +server.ts → src/lib/server/services/*
                            │                                    └─ src/lib/server/db (Drizzle)
                            └─ enqueue background jobs → pg-boss (Postgres) → worker
```

Business logic lives in `src/lib/server/services/`, not in routes. Routes are thin: they parse
input (Zod), call a service, and shape the response. This keeps logic testable with Vitest
without spinning up SvelteKit's routing, and keeps the permission check
(`requirePermission()`, added in Phase 2) in one place per action rather than scattered across
UI conditionals.

## Data flow for a typical mutation

Multi-table writes run inside a single Drizzle/Postgres transaction. Where a mutation should be
audited or trigger notifications, the service appends a row to the `activity_event` outbox
table (added in Phase 2) in the same transaction — the audit log and the notification system
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

Uploaded files (receipts, item photos, logos) live on a local Docker volume (`uploads`),
organized by year/entity, and are only ever served through an authorized SvelteKit route — never
directly by Caddy — so permission checks apply to file access the same way they apply to data
access.

## See also

- `docs/data-model.md` — entity-relationship diagram.
- `docs/PLAN.md` — phase plan, dependency versions, full schema draft, and the "Notes /
  decisions log" for non-obvious choices (e.g. why CSP is configured where it is).

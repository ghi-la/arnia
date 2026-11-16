# CLAUDE.md

Conventions and architecture notes for AI-assisted work on Arnia. See `docs/PLAN.md` for the
full phase plan, pinned dependency versions and the data model draft — keep it in sync
when you add collections or change the plan.

## What this is

Arnia is a mobile-first management app for non-profit associations (inventory,
events/activities, finance, invoicing with Swiss QR-bills). AGPL-3.0. Deployed on **Vercel**
with **MongoDB Atlas** (data) and **Cloudflare R2** (item photos) — no Docker, no servers, no CI
beyond Vercel's own builds. See `README.md` for the
full feature list and `docs/PLAN.md` §9 for the execution plan this was built against.

## Commands

```bash
pnpm install              # install deps (pnpm 12, see packageManager field)
pnpm dev                  # vite dev server (reads .env: MONGODB_URI, MONGODB_DB, BETTER_AUTH_SECRET)
pnpm check                # svelte-kit sync + svelte-check (type errors)
pnpm lint                 # prettier --check + eslint
pnpm format               # prettier --write
pnpm test:unit            # vitest (no database needed — services are tested with mocks)
pnpm build                # production build (adapter-vercel → .vercel/output)
pnpm db:seed              # (re)create default roles — the setup wizard already does this
pnpm storage:check        # verify the R2 configuration end to end
pnpm icons:generate       # rasterize static/brand/*.svg into static/icons/*.png
```

Local dev: `cp .env.example .env`, set `MONGODB_URI` (Atlas) with a **separate database name**
(`MONGODB_DB=arnia_dev`) and `BETTER_AUTH_SECRET`, then `pnpm dev`. Deploy: push to the main
branch (Vercel builds it). See `docs/deploy-vercel.md`.

## Architecture

- `src/lib/server/` — everything that must never reach the client: `db/` (MongoDB client,
  typed `collections`, `withTransaction`, document types in `types.ts`), `auth/`, `email/`
  (provider interface + Resend/SMTP + templates; `send.ts` sends directly and logs to
  `email_log`), `services/` (business logic per module), `storage/` (Cloudflare R2 — see below).
- `src/lib/components/` — UI. `ui/` holds hand-built primitives on top of `bits-ui`
  (shadcn-svelte's `init` CLI needs an interactive preset picker with no non-interactive mode,
  so components are hand-written following the same conventions instead — see `docs/PLAN.md`
  §4). `nav/` holds the app shell (bottom nav, sidebar, quick-action button).
- `src/lib/paraglide/` — **generated**, gitignored. Regenerated from `messages/*.json` +
  `project.inlang/settings.json` by the Vite plugin on `dev`/`build`, or
  `pnpm exec paraglide-js compile`. Never hand-edit files in here.
- `src/routes/` — `(app)` route group is the authenticated shell (sidebar/bottom nav layout);
  `(auth)` is unauthenticated (login, setup wizard, password reset). Business logic belongs in
  `src/lib/server/services/`, not in `+page.server.ts`/`+server.ts` — routes call services.
- **No background worker.** Vercel functions only live for a request, so work happens inline
  (emails are sent during the action that triggers them). Anything scheduled (reminders,
  mailbox polling) must become a Vercel Cron route — don't reintroduce a long-running process.
- `src/hooks.server.ts` — i18n (paraglide middleware) → session resolution (Better Auth +
  RBAC) → `svelteKitHandler` (mounts `/api/auth/*` and applies security headers), composed
  with `sequence()`. CSP is **not** set here — see below.
- `src/lib/server/auth/` — `index.ts` (the `betterAuth()` instance: MongoDB adapter, email
  hooks, invitation-gated signup, 2FA plugin), `permissions.ts` (the `Permission` union +
  `DEFAULT_ROLES` seed data), `session.ts` (`loadPermissions()`: unions a user's role
  permissions into one `Set`), `require-permission.ts` (`requireSession()` /
  `requirePermission()` — call one of these at the top of every gated load/action/endpoint).

## Auth & RBAC

- Sessions: `hooks.server.ts` calls `auth.api.getSession()` once per request and attaches a
  `SessionContext` (`{ user, permissions: Set<Permission>, roles }`) to `event.locals.session`.
  Routes never call Better Auth's session API directly — they read `locals.session` (via
  `requireSession`/`requirePermission`) so permission checks stay in one place.
- Permissions are a fixed, code-defined union (`src/lib/server/auth/permissions.ts`), not a DB
  collection — they're embedded as strings in each `role` document (`RoleDoc.permissions`),
  validated with `isPermission()`. A user's effective permissions are the **union** across all
  their roles (`user_role` documents, `_id` = `${userId}:${roleId}`).
- Signup is invitation-only, enforced in `auth/index.ts`'s `validateUserInfo` hook: it allows
  `sign-up/email` only when either no users exist yet (first-run admin) or the email has a
  pending, unexpired `invitation` document. New users are auto-verified
  (`databaseHooks.user.create.before` forces `emailVerified: true`) since the invitation link
  emailed to that address already proves ownership.
- Admin-triggered password resets (`resetUserPasswordByAdmin` in
  `services/set-password.ts`) write Better Auth's `account.password` field directly via
  `hashPassword`/`verifyPassword` from `better-auth/crypto` — not a Better Auth endpoint, since
  none of the built-in ones fit "an admin sets someone else's password to a temp value they
  didn't choose." Same helper backs invitation-based resets for an existing email
  (`redeemInvitationForExistingUser`).
- 2FA (TOTP) follows Better Auth's own state machine: `enableTwoFactor` returns a `totpURI` +
  backup codes but does **not** set `user.twoFactorEnabled` until the user calls `verifyTOTP`
  successfully — the settings page has an explicit "verify" step in between, it's not
  optional. QR codes are rendered server-side (`qrcode` → PNG data URL) from the `totpURI`.

## Things that will surprise you

- **CSP is configured in `svelte.config.js` (`kit.csp`, nonce mode), not in
  `hooks.server.ts`.** SvelteKit generates its own per-request nonce for its inline hydration
  bootstrap script and doesn't expose it to user code except via the `%sveltekit.nonce%`
  placeholder in `app.html`. Hand-rolling the CSP header in hooks would either block hydration
  or force `unsafe-inline`. The mode-watcher no-FOUC theme script is inlined directly in
  `app.html` behind that same placeholder (with `disableHeadScriptInjection` passed to
  `<ModeWatcher>` in the root layout) so both scripts share one nonce.
- **Dark mode is a `.dark` class on `<html>`**, toggled by `mode-watcher` — not a `data-theme`
  attribute. `src/app.css` defines light tokens on `:root`, dark overrides under `:root.dark`,
  plus a `prefers-color-scheme` fallback guarded by `:not(.light):not(.dark)` for the
  pre-hydration instant (see the inline script in `app.html`).
- **Internal links use `resolve()` from `$app/paths`**, not raw string hrefs — enforced by
  `svelte/no-navigation-without-resolve`. Generic wrapper components that accept an `href` prop
  (e.g. `ui/button`) can't resolve on the caller's behalf; those have a scoped
  `eslint-disable`/`eslint-enable` pair with a comment explaining why, and the _caller_ is
  responsible for passing an already-resolved href.
- **Money is integer minor units + a currency code, never floating point.** See
  `docs/PLAN.md` §0 and the finance/invoice schema draft.
- **TypeScript is pinned to 6.0.3, not the 7.x line** — `typescript-eslint` requires `<6.1.0`.
  Don't bump without checking the whole toolchain (svelte-check, eslint) first.
- **MongoDB ids are string UUIDs, never ObjectIds** — every collection uses `_id:
crypto.randomUUID()`, and Better Auth is configured the same way
  (`advanced.database.generateId`), so ids are plain strings in URLs, across collections, and in
  Better Auth's own `user`/`session`/`account`/`twoFactor` collections. Services return entities
  with `id` (via `toEntity`), never raw `_id`, to the rest of the app.
- **No migrations; indexes are ensured in the background** once per cold start
  (`ensureIndexes` in `db/index.ts` — add new indexes there). Because that's fire-and-forget,
  never rely on a unique index alone for user-facing correctness: check first, keep the index
  as a race backstop (see role creation in `settings/roles`). There are no foreign keys either
  — cascades are explicit (e.g. `deleteLocation` removes the subtree and unsets `locationId`).
- **Multi-document writes run in `withTransaction`** — pass `{ session }` to _every_ operation
  inside, or it silently runs outside the transaction. The driver retries the callback on
  transient errors, so it must have no side effects outside MongoDB (no emails, no R2 writes).
  Domain mutations append to the `activity_event` outbox in the same transaction (nothing reads
  it yet — the audit log viewer and notifications are later phases).
- Every load function, form action and API endpoint must call `requireSession()` or
  `requirePermission()` (`src/lib/server/auth/require-permission.ts`) — the UI hides what a
  user can't do, but the server is the only real enforcement point. Never trust client-side
  role checks alone.
- **Server modules read `process.env`, not `$env/*`**, so `tsx` scripts (`db:seed`,
  `storage:check`) work. `vite.config.ts` copies `.env` into `process.env` for
  dev/preview/vitest (Vite doesn't on its own); on Vercel the variables are real env vars.
- **Builds need no secrets or database.** `vite build` imports every server module once, so
  module-scope singletons must not connect or throw: the Mongo and R2 clients are lazy
  (`Proxy`, created on first use) and Better Auth gets a placeholder secret only while
  `building`. Keep any new singleton lazy the same way.
- **Vercel limits:** request/response bodies max 4.5 MB (`maxUploadMb()` caps photo uploads
  at 4; photos are compressed client-side and sent one per request), and functions are
  short-lived. The adapter uses the Node runtime — never switch routes to `edge` (the MongoDB
  driver, sharp and Better Auth need Node).

## File storage (Cloudflare R2)

- Attachment bytes live **only** in a private R2 bucket (`src/lib/server/storage/r2.ts`,
  `R2_*` env vars, setup in `docs/storage-r2.md`, verify with `pnpm storage:check`). Item
  attachments are **images only** (`ACCEPTED_IMAGES` in `services/item-photos.ts`).
- Never expose bucket URLs or presigned URLs to the browser: files are always streamed through
  `/attachments/[id]`, which runs `canAccessAttachment` (extend it per new `entityType` — it
  fails closed). This is also why CSP needs no R2 origin.
- Write attachments via `saveAttachment({ …, accept, afterInsert })` so the owning module's
  `activity_event` lands in the same transaction as the `attachment` document.
- Photos are added on the **create** and **edit** item forms (`item-photo-picker.svelte` queues
  them until the item exists, then `items/new` uploads them via `createSubmit`'s
  `beforeRedirect`; `item-photos.svelte` manages them immediately on edit). The detail page
  shows them read-only. All uploads go through `$lib/client/item-photo-upload.ts`.

## Testing

- Unit tests only (`pnpm test:unit`, Vitest): pure logic plus services with
  `$lib/server/db` / `$lib/server/storage` mocked via `vi.mock` (see
  `services/item-photos.test.ts`). They need no database and no network.
- There's no e2e suite and no CI; Vercel just builds and deploys. Before pushing, run
  `pnpm check && pnpm lint && pnpm test:unit`, and click through anything you changed with
  `pnpm dev` against a **dev** database (`MONGODB_DB=arnia_dev`).

## Conventions

- Strict TypeScript everywhere; no `any` without a comment explaining why.
- Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`) — no legacy `export let` / stores
  for component-local state. `$app/state`, not the deprecated `$app/stores`.
- Tailwind v4 CSS-first config (`src/app.css`, `@theme inline`) — no `tailwind.config.js`.
- All UI strings and email copy go through Paraglide (`messages/*.json`, `m.xxx()`), in all
  four languages (it/de/fr/en; it is the base locale). Never hardcode user-facing text.
- Mobile-first: design every screen at ~375px first (see `docs/PLAN.md` §3), then scale up.
  Touch targets ≥ 44×44px (the default `Button` size already satisfies this).
- No external CDNs/fonts/analytics at runtime. The only external services are MongoDB Atlas,
  Cloudflare R2, and the configured email provider (Resend or SMTP).
- **Every form uses `createSubmit()`** (`src/lib/client/submit.svelte.ts`) with
  `use:enhance={x.enhance}` and `<Button loading={x.pending}>` — no action may be silent. It
  gives a pending state, an optional `confirm` (styled dialog; required for anything
  destructive), and success/error toasts (also on redirects). Actions should `return` something
  on success (even `{ deleted: true }`) and `fail()` with a code the page maps to a localized
  message. Show field errors with `FieldError` + `aria-invalid`/`aria-describedby`; never
  render Zod's (English) messages. Format dates/money with `$lib/format`, never a hardcoded
  locale.
- Zod v4: use the non-deprecated top-level/standalone forms — `z.email()` piped
  (`z.string().trim().pipe(z.email())`), not the old chained `.email()` method; and
  `z.flattenError(result.error)`, not `result.error.flatten()`.

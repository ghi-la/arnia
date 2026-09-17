# CLAUDE.md

Conventions and architecture notes for AI-assisted work on Arnia. See `docs/PLAN.md` for the
full phase plan, pinned dependency versions and the database schema draft — keep it in sync
when you add tables or change the plan.

## What this is

Arnia is a self-hosted, mobile-first management app for non-profit associations (inventory,
events/activities, finance, invoicing with Swiss QR-bills). AGPL-3.0. See `README.md` for the
full feature list and `docs/PLAN.md` §9 for the execution plan this was built against.

## Commands

```bash
pnpm install              # install deps (pnpm 12, see packageManager field)
pnpm dev                  # vite dev server (needs DATABASE_URL — see docker-compose.dev.yml)
pnpm worker:dev            # pg-boss worker, hot-reloading
pnpm check                # svelte-kit sync + svelte-check (type errors)
pnpm lint                 # prettier --check + eslint
pnpm format                # prettier --write
pnpm test:unit             # vitest
pnpm test:e2e               # playwright (needs a running app + db)
pnpm build                # production build (adapter-node)
pnpm db:generate            # drizzle-kit generate (writes drizzle/*.sql from schema/*.ts)
pnpm db:migrate             # runs pending migrations (advisory-lock guarded)
pnpm db:seed                 # seed default roles/categories (--demo for demo org data)
pnpm icons:generate          # rasterize static/brand/*.svg into static/icons/*.png
```

Local dev DB + mail catcher: `docker compose -f docker-compose.dev.yml up -d`, then
`cp .env.example .env`, set `DATABASE_URL=postgres://arnia:devpassword@localhost:5432/arnia`
and `EMAIL_PROVIDER=smtp` (Mailpit on `localhost:8025`).

Full stack (prod-like): `./scripts/generate-secrets.sh && docker compose up -d --build`.

## Architecture

- `src/lib/server/` — everything that must never reach the client: `db/` (Drizzle schema +
  client + migration runner), `auth/`, `email/` (provider interface + Resend/SMTP + templates),
  `services/` (business logic per module — inventory, events, finance, invoices, qrbill,
  notifications, mail ingestion), `jobs/` (pg-boss job definitions), `storage/`, `crypto/`.
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
- `src/worker.ts` — pg-boss worker entry point, deployed as a separate container
  (`docker-compose.yml` `worker` service) sharing the same image as `app`. Run via plain
  `tsx`, not through Vite — see the `$env` gotcha below before importing anything into it.
- `src/hooks.server.ts` — i18n (paraglide middleware) → session resolution (Better Auth +
  RBAC) → `svelteKitHandler` (mounts `/api/auth/*` and applies security headers), composed
  with `sequence()`. CSP is **not** set here — see below.
- `src/lib/server/auth/` — `index.ts` (the `betterAuth()` instance: Drizzle adapter, email
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
  table — `role_permission.permission_key` is just text, validated against that union with
  `isPermission()`. A user's effective permissions are the **union** across all their roles.
- Signup is invitation-only, enforced in `auth/index.ts`'s `validateUserInfo` hook: it allows
  `sign-up/email` only when either no users exist yet (first-run admin) or the email has a
  pending, unexpired `invitation` row. New users are auto-verified
  (`databaseHooks.user.create.before` forces `emailVerified: true`) since the invitation link
  emailed to that address already proves ownership.
- Admin-triggered password resets (`resetUserPasswordByAdmin` in
  `services/set-password.ts`) write the `account.password` column directly via
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
- **Money is `bigint`/integer minor units + a currency code, never floating point.** See
  `docs/PLAN.md` §0 and the finance/invoice schema draft.
- **TypeScript is pinned to 6.0.3, not the 7.x line** — `typescript-eslint` requires `<6.1.0`.
  Don't bump without checking the whole toolchain (svelte-check, drizzle-kit, eslint) first.
- **`tsx` is a production dependency**, not a dev one — `src/worker.ts` and
  `src/lib/server/db/migrate.ts` run via `tsx` inside the runtime Docker image (see
  `docker/entrypoint.sh` and the `worker` service's `command:` in `docker-compose.yml`), so it
  can't be pruned by `pnpm prune --prod`.
- **`$env/*` doesn't resolve under plain `tsx`** (it's a Vite-only virtual module — throws
  `ERR_MODULE_NOT_FOUND`), so anything reachable from `src/worker.ts` uses `process.env`
  directly instead: `db/index.ts`, `email/index.ts`, `jobs/queue.ts`. `$lib/*` aliases DO
  resolve fine under `tsx` (via tsconfig paths) — it's specifically `$env/*` that doesn't. If
  you add a new module the worker imports (transitively or not), check it doesn't pull in
  `$env/*`.
- **Multi-table writes run in DB transactions**, and domain mutations should append to the
  `activity_event` outbox table rather than writing directly to audit/notification tables —
  that's what feeds both (the outbox exists; nothing reads it yet — the audit log viewer and
  notification system are Phase 7/9).
- Every load function, form action and API endpoint must call `requireSession()` or
  `requirePermission()` (`src/lib/server/auth/require-permission.ts`) — the UI hides what a
  user can't do, but the server is the only real enforcement point. Never trust client-side
  role checks alone.
- **`docker build` needs a `DATABASE_URL` and `BETTER_AUTH_SECRET`, even though they're only
  real at runtime.** SvelteKit's production build imports every server module once (route
  analysis), which throws if `db/index.ts` or `auth/index.ts` can't construct. `db/index.ts`
  is lazy (a `Proxy`, connects on first real use) so it doesn't need this at all; Better Auth
  can't be made lazy the same way, so the Dockerfile's `build` stage sets harmless placeholder
  `ENV` values that never reach the runtime image or its container (docker-compose's real
  environment always overrides them at container start). If you add another module-scope
  singleton that reads `process.env` and throws when it's missing, either make it lazy too or
  add a placeholder for it in the `build` stage — see `docs/PLAN.md` §4 for the full story.

## Testing

- `e2e/global-setup.ts` runs the first-run setup wizard **once**, before any test project
  starts, and saves the resulting session to `e2e/.auth/admin.json` (gitignored). Specs that
  need to start already logged in use `test.use({ storageState: 'e2e/.auth/admin.json' })`
  (see `e2e/smoke.spec.ts`) instead of re-running the wizard — it creates the singleton
  `organization` row, so running it per-project (there are three device profiles) would race.
  Specs that must start unauthenticated override with
  `test.use({ storageState: { cookies: [], origins: [] } })` (see `e2e/auth.spec.ts`).
- Playwright's e2e suite therefore needs a genuinely empty database (no organization/users) to
  pass — that's what CI's fresh postgres service provides every run. Running it locally means
  resetting your dev DB first (drop/recreate, then `pnpm db:migrate`).

## Conventions

- Strict TypeScript everywhere; no `any` without a comment explaining why.
- Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`) — no legacy `export let` / stores
  for component-local state. `$app/state`, not the deprecated `$app/stores`.
- Tailwind v4 CSS-first config (`src/app.css`, `@theme inline`) — no `tailwind.config.js`.
- All UI strings and email copy go through Paraglide (`messages/*.json`, `m.xxx()`), in all
  four languages (it/de/fr/en; it is the base locale). Never hardcode user-facing text.
- Mobile-first: design every screen at ~375px first (see `docs/PLAN.md` §3), then scale up.
  Touch targets ≥ 44×44px (the default `Button` size already satisfies this).
- No external CDNs/fonts/analytics at runtime. The only external service is the configured
  email provider (Resend by default, SMTP as a self-hosted alternative).
- Zod v4: use the non-deprecated top-level/standalone forms — `z.email()` piped
  (`z.string().trim().pipe(z.email())`), not the old chained `.email()` method; and
  `z.flattenError(result.error)`, not `result.error.flatten()`.

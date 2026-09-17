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
  (`docker-compose.yml` `worker` service) sharing the same image as `app`.
- `src/hooks.server.ts` — i18n (paraglide middleware) + security headers, composed with
  `sequence()`. CSP is **not** set here — see below.

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
- **Multi-table writes run in DB transactions**, and domain mutations should append to the
  `activity_event` outbox table (added in Phase 2) rather than writing directly to audit/
  notification tables — that's what feeds both.
- Every load function, form action and API endpoint must call the central
  `requirePermission()` helper (added in Phase 2) — the UI hides what a user can't do, but the
  server is the only real enforcement point. Never trust client-side role checks alone.

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

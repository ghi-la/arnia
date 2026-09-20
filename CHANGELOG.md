# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project doesn't follow semantic
versioning releases yet (pre-1.0, see `docs/PLAN.md`).

## [Unreleased]

### Added — Phase 1: Foundation

- Project scaffolding: SvelteKit 2 (Svelte 5, runes) + TypeScript strict, Vite 8, pinned exact
  dependency versions (see `docs/PLAN.md` §1).
- Tailwind CSS v4 (CSS-first config) design system: light/dark tokens, hand-built UI primitives
  on `bits-ui` (Button, Card, Badge, Input, Label, Skeleton) since shadcn-svelte's `init` CLI
  has no non-interactive mode.
- Mobile-first app shell: bottom tab bar (mobile) / sidebar (tablet+), floating quick-action
  button, theme toggle, safe-area-aware layout.
- i18n via Paraglide JS v2: Italian (base), German, French, English.
- PostgreSQL + Drizzle ORM: connection setup, migration runner with an advisory-lock guard
  (safe for concurrent container starts), initial `organization` singleton schema.
- Auth/session scaffolding (`src/lib/server/auth/session.ts`) as a placeholder for Phase 2.
- Security headers + CSP via SvelteKit's `kit.csp` (nonce mode) in `hooks.server.ts`.
- PWA scaffolding: manifest, generated icon set from `static/brand/*.svg`, service worker
  (`@vite-pwa/sveltekit`).
- Docker: multi-stage `Dockerfile` (non-root user, healthcheck), `docker-compose.yml`
  (app/worker/db/caddy/backup services with automatic HTTPS via Caddy), `docker-compose.dev.yml`
  (Postgres + Mailpit for local development), backup/restore scripts.
- Repository hygiene: `.gitignore`/`.dockerignore`/`.gitattributes`, `LICENSE` (AGPL-3.0),
  `README.md`/`README.it.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  `CLAUDE.md`, CI (GitHub Actions: lint, type-check, unit tests, Docker build), Dependabot.
- `docs/PLAN.md`: full execution plan, pinned dependency versions, database schema draft.

### Added — Phase 2: Auth, email & RBAC

- Better Auth integration (email + password, Drizzle adapter on Postgres): session resolution
  in `hooks.server.ts`, `user`/`session`/`account`/`verification`/`two_factor` schema.
- First-run setup wizard (`/setup/*`): disclaimer, admin account, organization details,
  languages + email provider test, optional VAT + default-role seeding, gated so it's only
  reachable before the instance is configured.
- Role-based access control: fine-grained permissions defined in code
  (`src/lib/server/auth/permissions.ts`), admin-editable roles with a multi-role union model,
  seeded defaults (Admin, Board, Treasurer, Warehouse manager, Event manager, Volunteer,
  Read-only), a central `requirePermission()`/`requireSession()` server-side gate, and a
  roles/permissions admin UI (`/settings/roles`).
- Invitations: admin-issued, single-use, expiring links (`/settings/users`,
  `/accept-invite/[token]`); doubles as an admin-initiated password reset path for an existing
  email. Shows the link directly in the UI when `EMAIL_PROVIDER=none`.
- Password reset: self-service (email link) when a provider is configured, or an admin-set
  temporary password otherwise (`resetUserPasswordByAdmin`), both revoking existing sessions.
- Optional TOTP two-factor authentication (`/settings/security`): QR setup, backup codes,
  2FA-aware login flow.
- `EmailProvider` abstraction (Resend / SMTP / none) with a pg-boss-backed send queue with
  retries and a status-only `email_log` (no message bodies stored), and localized HTML/text
  email templates (invite, password reset, email-change confirmation).
- `pnpm db:seed`: seeds the default roles (category seeding and `--demo` data arrive with the
  inventory/finance/events modules).
- Vitest permission-enforcement tests; Playwright e2e coverage for the full setup wizard
  (`e2e/global-setup.ts`, run once and reused via `storageState` — see `CLAUDE.md`) and the
  login flow.

### Fixed

- `backup` service could run its first `pg_dump` before Postgres finished starting up
  (`depends_on: [db]` with no health condition), logging a harmless but noisy connection-refused
  error on a cold `docker compose up`. Now waits on `db`'s healthcheck like the other services.
- Login didn't preserve the entered email after a failed attempt, forcing it to be retyped.
- `docker build` failed outright once the auth/RBAC modules landed: SvelteKit's production
  build imports every server module to inspect its exports, and both `db/index.ts` and
  `auth/index.ts` threw immediately without `DATABASE_URL`/`BETTER_AUTH_SECRET`, which aren't
  available at build time. `db/index.ts` now connects lazily on first real use; the
  Dockerfile's build stage sets harmless placeholder values for the rest (never copied into
  the runtime image).
- The `worker` container crash-looped in production (`Cannot find package '$lib'`): the
  runtime image never shipped the `src/lib/server/**` files `src/worker.ts` imports, and
  `$lib/*` doesn't resolve there anyway (no tsconfig in that image). Fixed by copying
  `src/lib/server` into the runtime image and switching the worker's whole import chain to
  relative paths. The `docker-build` CI job now actually starts the stack and waits for every
  container to report healthy, rather than only building the image — that gap is what let this
  one through.

[Unreleased]: https://github.com/your-org/arnia/compare/HEAD

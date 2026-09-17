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

### Fixed

- `backup` service could run its first `pg_dump` before Postgres finished starting up
  (`depends_on: [db]` with no health condition), logging a harmless but noisy connection-refused
  error on a cold `docker compose up`. Now waits on `db`'s healthcheck like the other services.

[Unreleased]: https://github.com/your-org/arnia/compare/HEAD

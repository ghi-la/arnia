# Contributing to Arnia

Thanks for considering a contribution. Arnia is a young project (see `docs/PLAN.md` for where
things stand); expect some churn while the foundations settle.

## Getting set up

```bash
pnpm install
cp .env.example .env   # set MONGODB_URI (use a separate dev database), BETTER_AUTH_SECRET
pnpm dev
```

The database needs no migration step: collections and indexes are created on first use.

See `CLAUDE.md` for architecture notes, conventions, and the full command list — it's written
for AI-assisted work but is equally useful for humans.

## Before opening a PR

```bash
pnpm lint      # prettier --check + eslint
pnpm check     # svelte-check (types)
pnpm test:unit # no database needed
```

All three must pass. Deploys happen on Vercel from the main branch (see `docs/deploy-vercel.md`).

## Conventions

- **Conventional Commits** for commit messages (`feat:`, `fix:`, `docs:`, `chore:`, …).
- TypeScript strict mode, no unexplained `any`.
- Business logic lives in `src/lib/server/services/`, not in routes — routes call services.
- All user-facing strings go through Paraglide (`messages/*.json`) in all four supported
  languages (it/de/fr/en). Don't hardcode text.
- Every permission-gated action must be enforced server-side (`requirePermission()`), not just
  hidden in the UI.
- Money is integer minor units + a currency code — never floating point.
- Mobile-first: design at ~375px width before scaling up to tablet/desktop.

## Reporting bugs / requesting features

Open a GitHub issue with steps to reproduce (for bugs) or the problem you're trying to solve
(for features). For security issues, see `SECURITY.md` instead — please don't open a public
issue.

## License

By contributing, you agree your contributions are licensed under the project's
[AGPL-3.0](LICENSE) license.

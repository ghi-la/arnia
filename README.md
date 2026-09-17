# Arnia 🐝

**Arnia** (Italian for "beehive") is an open-source, self-hosted management app for non-profit
associations and similar community organizations: inventory, events/activities, and finances —
including Swiss QR-bill invoicing — in one mobile-first tool. Built for volunteers on their
phones first, desktop second.

> **Project status:** under active development. See [`docs/PLAN.md`](docs/PLAN.md) for the
> phase-by-phase build plan and what's done so far. Not yet ready for production use.

[Italiano](README.it.md)

## Disclaimer

Arnia is provided "as is", without warranty of any kind. It is **not legal, tax, or accounting
advice**. Whoever installs and operates an instance of Arnia is solely responsible for how it
is used, for the data it contains, and for meeting any obligations — legal, fiscal, data
protection, or otherwise — that apply to them in their jurisdiction. Arnia does not claim
compliance with any specific law or regulation.

## Features (target scope)

- **Inventory** — items, categories, hierarchical storage locations, barcode/QR scanning, a
  stock-movement ledger (purchases, event checkout/return, adjustments, disposal), weighted
  average costing for consumables, equipment condition tracking, low-stock alerts, CSV import/
  export.
- **Events / activities** (the label is configurable) — planning, budget vs. actual, material
  reservation with conflict detection, checklists, team roles scoped to an event, closing an
  event with a generated balance-sheet PDF.
- **Finance** — accounts, categorized transactions, expense reimbursements with photo receipts
  and an approval flow, fiscal years, audit log, per-event and annual reports (PDF/CSV).
- **Contacts & invoices** — sequential invoice numbering, line items, and **Swiss QR-bill**
  generation (QRR/SCOR references, QR-IBAN detection) per the current SIX implementation
  guidelines, with a graceful fallback for organizations outside Switzerland.
- **Notifications** — an in-app notification center is the primary channel, with optional email
  digests.
- **Email inbox with rules** — forward receipts and correspondence to a dedicated mailbox;
  configurable rules can tag, link to an event, or create a draft expense automatically.
- **Installable PWA** — works offline for the last-viewed data; new expenses and stock
  movements created offline sync when back online.
- **Self-hosted by design** — no external CDNs, fonts, or analytics. The only external service
  used by default is [Resend](https://resend.com) for transactional email, and it's replaceable
  with your own SMTP server.

Full functional spec lives in the project's build plan; see `docs/PLAN.md`.

## Tech stack

SvelteKit 2 (Svelte 5) · TypeScript · PostgreSQL + Drizzle ORM · Better Auth · Tailwind CSS v4 ·
Paraglide JS (i18n: Italian, German, French, English) · pg-boss · Docker Compose · Caddy
(automatic HTTPS). Exact pinned versions are in `docs/PLAN.md` §1.

## Quick start (production, with a domain)

Requires Docker and a domain's DNS `A`/`AAAA` record pointing at the server, with ports 80/443
reachable — Caddy handles the rest automatically, no manual certificate steps.

```bash
git clone https://github.com/<your-org>/arnia.git && cd arnia
cp .env.example .env
./scripts/generate-secrets.sh   # fills in POSTGRES_PASSWORD, BETTER_AUTH_SECRET, APP_ENCRYPTION_KEY
# edit .env: set APP_DOMAIN, and an email provider (see "Email" below)
docker compose up -d --build
```

Open `https://<APP_DOMAIN>` — you'll land on the first-run setup wizard.

### Local testing (no domain)

The app also runs on plain `http://localhost` for evaluation: set `APP_DOMAIN=localhost` and
skip the `caddy` service, or run the `app`/`db`/`worker` services directly and hit
`http://localhost:3000`. The PWA and service worker install correctly on `localhost` in a
desktop browser. Other devices on your LAN will get a limited, non-installable experience
without real HTTPS — that's a browser restriction, not something Arnia can work around locally.

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres + Mailpit (mail catcher)
pnpm install
cp .env.example .env   # DATABASE_URL → localhost:5432, EMAIL_PROVIDER=smtp
pnpm db:migrate
pnpm dev
```

Mailpit's web UI (`http://localhost:8025`) shows every email the app sends in dev, without
delivering anything externally. Run `pnpm worker:dev` alongside `pnpm dev` for background jobs
(email sending, IMAP polling, reminders).

## Email (Resend or SMTP)

Set `EMAIL_PROVIDER` in `.env` to `resend`, `smtp`, or `none`:

- **`resend`** (default) — set `RESEND_API_KEY` and `EMAIL_FROM`. Resend requires a verified
  sending domain: add the DNS records it gives you for `EMAIL_FROM`'s domain before going live,
  or mail will fail to send.
- **`smtp`** — point at any SMTP server (self-hosted Postfix, your provider's SMTP relay, or
  Mailpit in dev) via the `SMTP_*` variables in `.env.example`.
- **`none`** — no email is sent at all; the admin copies invitation and password-reset links
  directly from the UI instead. Useful for fully offline/air-gapped instances.

## Backup and restore

The `backup` service dumps the database and archives the `uploads` volume into the `backups`
volume on a schedule (`BACKUP_INTERVAL_HOURS`, default 24h), pruning anything older than
`BACKUP_RETENTION_DAYS` (default 14).

```bash
# list available backups
docker compose exec backup ls /backups

# restore a specific backup (stop app/worker first to avoid racing writes)
docker compose stop app worker
docker compose exec backup /scripts/restore.sh 20260101T000000Z
docker compose up -d app worker
```

## Installing the PWA

Once running over HTTPS (or on `localhost`), Arnia can be installed like a native app:

- **iOS/iPadOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** an "Install app" prompt appears automatically; you can also use the
  browser menu → Install app.
- **Desktop (Chrome/Edge):** an install icon appears in the address bar.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Security issues: see [`SECURITY.md`](SECURITY.md).

## License

[AGPL-3.0](LICENSE).

# Arnia 🐝

**Arnia** (Italian for "beehive") is an open-source management app for non-profit
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
- **Private by design** — no external CDNs, fonts, or analytics. Data lives in your own MongoDB
  Atlas cluster and photos in your own private Cloudflare R2 bucket; email goes through
  [Resend](https://resend.com) or your own SMTP server.

Full functional spec lives in the project's build plan; see `docs/PLAN.md`.

## Tech stack

SvelteKit 2 (Svelte 5) · TypeScript · MongoDB Atlas · Better Auth · Tailwind CSS v4 ·
Paraglide JS (i18n: Italian, German, French, English) · Cloudflare R2 (photos) · deployed on
Vercel. Exact pinned versions are in `docs/PLAN.md` §1.

## Deploy (Vercel + MongoDB Atlas)

1. Create a MongoDB Atlas cluster, a database user, and allow Vercel to connect
   (Network Access).
2. Import this repository in Vercel and set the environment variables from
   [`.env.example`](.env.example).
3. Deploy, open the URL, and complete the first-run setup wizard.

Step by step, including where to find each value: [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

## Local development

```bash
pnpm install
cp .env.example .env   # MONGODB_URI (use a separate dev database name), BETTER_AUTH_SECRET
pnpm dev               # http://localhost:5173 → first-run setup wizard
```

No migrations: collections and indexes are created on first use. Useful commands:
`pnpm check` (types), `pnpm lint`, `pnpm test:unit`, `pnpm storage:check` (verifies R2).

## Email (Resend or SMTP)

Set `EMAIL_PROVIDER` in `.env` to `resend`, `smtp`, or `none`:

- **`resend`** (default) — set `RESEND_API_KEY` and `EMAIL_FROM`. Resend requires a verified
  sending domain: add the DNS records it gives you for `EMAIL_FROM`'s domain before going live,
  or mail will fail to send.
- **`smtp`** — point at any SMTP server (self-hosted Postfix, your provider's SMTP relay, or
  Mailpit in dev) via the `SMTP_*` variables in `.env.example`.
- **`none`** — no email is sent at all; the admin copies invitation and password-reset links
  directly from the UI instead.

## File storage (Cloudflare R2)

Item photos are stored in a private [Cloudflare R2](https://developers.cloudflare.com/r2/)
bucket and served through the app (with permission checks), never directly. Setup takes about
five minutes — follow [`docs/storage-r2.md`](docs/storage-r2.md), then verify with
`pnpm storage:check`.

## Backups

- **Database:** use Atlas's built-in backups (Atlas → your cluster → Backup; continuous cloud
  backups need a dedicated M10+ tier — on free/shared tiers, export with `mongodump` on a
  schedule).
- **Photos:** see "Backups" in [`docs/storage-r2.md`](docs/storage-r2.md).

## Installing the PWA

Once deployed (Vercel serves HTTPS automatically), Arnia can be installed like a native app:

- **iOS/iPadOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** an "Install app" prompt appears automatically; you can also use the
  browser menu → Install app.
- **Desktop (Chrome/Edge):** an install icon appears in the address bar.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Security issues: see [`SECURITY.md`](SECURITY.md).

## License

[AGPL-3.0](LICENSE).

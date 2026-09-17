# Arnia — Execution Plan

This document is the working plan for building Arnia. It is updated as work progresses;
treat section 2 (task breakdown) as the source of truth for "what's left."

## 1. Pinned dependency versions

Verified against npm registry / Docker Hub on 2026-09-17. Re-check before bumping.

| Package                         | Version                               | Notes                                                                                                                 |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Node.js                         | 24.8.0 (LTS)                          | `node:24.8.0-alpine` in Docker                                                                                        |
| pnpm                            | 12.4.2                                | via corepack                                                                                                          |
| TypeScript                      | 6.0.3                                 | **not** 7.x — `typescript-eslint` requires `<6.1.0`; TS7 (native/tsgo) ecosystem support isn't there yet              |
| svelte                          | 5.57.0                                | runes mode                                                                                                            |
| @sveltejs/kit                   | 2.70.3                                |                                                                                                                       |
| @sveltejs/adapter-node          | 5.5.7                                 |                                                                                                                       |
| @sveltejs/vite-plugin-svelte    | 7.3.0                                 |                                                                                                                       |
| vite                            | 8.3.0                                 |                                                                                                                       |
| tailwindcss / @tailwindcss/vite | 4.3.3                                 | CSS-first config, no `tailwind.config.js`                                                                             |
| bits-ui                         | 2.19.2                                | shadcn-svelte primitives                                                                                              |
| shadcn-svelte (CLI)             | 1.7.0                                 | init CLI requires an interactive preset picker (shadcn-svelte.com); components hand-built on bits-ui instead — see §4 |
| @lucide/svelte                  | 1.47.0                                | `lucide-svelte` is deprecated in favor of this scoped package                                                         |
| tailwind-variants               | 3.3.1                                 | component variant styling (shadcn-svelte convention)                                                                  |
| @fontsource/inter               | 5.3.0                                 | self-hosted font                                                                                                      |
| drizzle-orm                     | 0.45.2                                |                                                                                                                       |
| drizzle-kit                     | 0.31.10                               |                                                                                                                       |
| postgres (driver)               | 3.4.9                                 |                                                                                                                       |
| better-auth                     | 1.7.5                                 |                                                                                                                       |
| resend                          | 6.28.1                                |                                                                                                                       |
| nodemailer                      | 10.0.10                               | SMTP fallback provider                                                                                                |
| pg-boss                         | 12.33.0                               | Postgres-backed queue                                                                                                 |
| zod                             | 4.6.5                                 |                                                                                                                       |
| sveltekit-superforms            | 2.30.2                                | zod4 adapter                                                                                                          |
| formsnap                        | 2.0.1                                 |                                                                                                                       |
| @inlang/paraglide-js            | 2.25.4                                | v2 — own Vite plugin, no separate `-sveltekit` package                                                                |
| @vite-pwa/sveltekit             | 1.1.0                                 |                                                                                                                       |
| swissqrbill                     | 4.4.1                                 |                                                                                                                       |
| pdfkit                          | 0.20.2                                |                                                                                                                       |
| @zxing/browser                  | 0.2.1                                 |                                                                                                                       |
| imapflow                        | 2.0.5                                 |                                                                                                                       |
| mailparser                      | 3.9.28                                |                                                                                                                       |
| sharp                           | 0.35.4                                | thumbnails                                                                                                            |
| vitest                          | 5.0.1                                 |                                                                                                                       |
| @playwright/test                | 1.63.0                                |                                                                                                                       |
| eslint                          | 10.10.0                               | flat config                                                                                                           |
| typescript-eslint               | 8.70.0                                |                                                                                                                       |
| eslint-plugin-svelte            | 3.23.0                                |                                                                                                                       |
| prettier                        | 3.9.7                                 |                                                                                                                       |
| svelte-check                    | 4.7.6                                 |                                                                                                                       |
| pino                            | 10.3.1                                | structured logging                                                                                                    |
| web-push                        | 3.6.7                                 | phase 11 only                                                                                                         |
| PostgreSQL                      | 18.6 (Docker `postgres:18.6-alpine`)  | current stable major                                                                                                  |
| Caddy                           | 2.11.4 (Docker `caddy:2.11.4-alpine`) | automatic HTTPS                                                                                                       |
| Node (Docker base image)        | `node:24.8.0-alpine`                  | matches engines.node                                                                                                  |

## 2. Phase checklist

- [x] Phase 0 — this plan
- [x] Phase 1 — Foundation
- [ ] Phase 2 — Auth, email & RBAC
- [ ] Phase 3 — Inventory
- [ ] Phase 4 — Events
- [ ] Phase 5 — Finance
- [ ] Phase 6 — Contacts & Swiss QR-bill invoices
- [ ] Phase 7 — Notifications & PWA
- [ ] Phase 8 — Email ingestion
- [ ] Phase 9 — Dashboard, search, settings, data export
- [ ] Phase 10 — Hardening & release (v0.1.0)
- [ ] Phase 11 — Optional Web Push

Each phase ends with: lint + check + unit tests + relevant e2e green, app runs via
`docker compose up`, `CHANGELOG.md` updated, commit.

## 3. Database schema draft

Money = integer minor units (`bigint`) + `currency` char(3). Timestamps = `timestamptz`.
All business tables carry `created_at`, `updated_at`; mutable domain tables carry
`created_by`/`updated_by` where useful for audit.

### Core / platform

- **organization** (singleton row): name, address fields (street, house_no, postal_code,
  town, country), email, phone, website, logo_path, iban, is_qr_iban, default_currency,
  timezone, default_locale, enabled_locales[], vat_enabled, vat_number, terminology (jsonb,
  e.g. event label override), fiscal_year_start_month, invoice_number_pattern,
  invoice_default_due_days, setup_completed_at.
- **user** / **session** / **account** / **verification** — Better Auth core tables
  (generated by its schema tooling) + our extension columns on `user`
  (locale, is_active, notification_prefs handled separately).
- **role**: id, key, name (i18n key or free text), description, is_system.
- **role_permission**: role_id, permission_key (text, matches code-defined permission enum).
- **user_role**: user_id, role_id.
- **event_team_member**: event_id, user_id, role_id (event-scoped role).
- **invitation**: email, role_ids[], token_hash, invited_by, expires_at, accepted_at.
- **activity_event** (outbox): id, type, entity_type, entity_id, actor_user_id, event_id
  (nullable, for scoping), payload (jsonb), created_at. Feeds audit log + notifications.
- **audit_log**: derived/read from activity_event for financial + admin actions; may be a
  filtered view rather than a separate table.
- **notification**: id, user_id, type, title, body, link, related_entity, read_at, created_at.
- **notification_preference**: user_id, type, in_app_enabled, email_enabled.
- **email_log**: id, to, template, status (queued/sent/failed), error, created_at (no body).

### Inventory

- **location**: id, parent_id (self-ref), name, kind (site/room/shelf).
- **inventory_category**: id, parent_id, name.
- **item**: id, name, description, category_id, location_id, unit, sku, barcode, type
  (consumable/equipment), min_threshold, supplier, notes, avg_cost_minor, current_qty
  (cached), equipment_tracking (unit/quantity), purchase_value_minor, usage_cost_minor,
  condition (for single-unit equipment).
- **item_photo**: item_id, attachment_id.
- **stock_movement**: id, item_id, type (purchase/consumption/checkout/return/adjustment/
  disposal), qty, unit_cost_minor, event_id (nullable), reason, condition_on_return,
  created_by, created_at.

### Events

- **event**: id, title, description, starts_at, ends_at, location, status, cover_attachment_id,
  notes, budget_minor (jsonb per category or separate table), created_by.
- **event_budget_line**: event_id, category_id, budget_minor.
- **event_checklist_item**: event_id, title, assignee_user_id, done_at.
- **event_tag** / **event_tag_link**.
- **event_material_line**: event_id, item_id, planned_qty, reserved_qty, checked_out_qty,
  returned_qty, returned_damaged_qty, returned_lost_qty, status.
- **event_external_cost** → modeled as `finance_transaction` with `event_id` set and
  `category` external-cost subtype; avoids duplicating money logic.

### Finance

- **account**: id, name, kind (cash/bank/event_box), opening_balance_minor, currency.
- **fiscal_year**: id, starts_on, ends_on, closed_at.
- **finance_category**: id, parent_id, kind (income/expense), name.
- **finance_transaction**: id, kind (income/expense/transfer), date, amount_minor, currency,
  account_id, to_account_id (transfers), category_id, description, counterparty, event_id,
  payment_method, status (draft/recorded/approved), submitted_by, approved_by, paid_at.
- **transaction_attachment**: transaction_id, attachment_id.

### Contacts & invoices

- **contact**: id, kind (customer/supplier/sponsor/member), display_name, address fields,
  email, phone, notes.
- **invoice**: id, number, fiscal_year, issue_date, due_date, contact_id, event_id, language,
  status, currency, reference_type (QRR/SCOR/NON), reference_number, notes.
- **invoice_line**: invoice_id, description, qty, unit_price_minor, vat_rate.
- **invoice_payment**: invoice_id, amount_minor, date, account_id, transaction_id.

### Email ingestion

- **mail_account**: imap config, credentials_encrypted (AES-256-GCM), poll_interval_s, enabled.
- **mail_message**: id, mail_account_id, message_id, from, subject, received_at, raw_path,
  status (unsorted/kept/discarded), tag, event_id, category_id.
- **mail_rule**: id, name, priority, condition_tree (jsonb), actions (jsonb), stop_on_match,
  enabled.

### Attachments

- **attachment**: id, entity_type, entity_id, path, thumbnail_path, mime, size, uploaded_by.

Exact Drizzle table definitions are written per-phase in `src/lib/server/db/schema/*.ts`
(one file per module) as each phase is implemented, and kept in sync with this draft.
See `docs/data-model.md` (added in Phase 1) for the generated ER diagram.

## 4. Notes / decisions log

- TypeScript pinned to 6.0.3 rather than the newer 7.x line because typescript-eslint,
  svelte-check and drizzle-kit's toolchain assume TS 5/6 semantics; revisit once the
  ecosystem catches up.
- Paraglide JS v2 replaces the old `@inlang/paraglide-sveltekit` package with its own Vite
  plugin — no separate SvelteKit adapter package needed.
- `event_external_cost` is not a separate table: external costs and revenues linked to an
  event are just `finance_transaction` rows with `event_id` set, keeping one ledger instead
  of two parallel money models.
- shadcn-svelte's `init` CLI (1.7.0) now requires picking a design-system preset from
  shadcn-svelte.com interactively, with no non-interactive flag — not scriptable from a
  headless session. UI primitives (Button, Card, Badge, Input, Label, Skeleton, nav) were
  hand-built directly on `bits-ui` instead, following the same conventions (tailwind-variants
  for variant styling, `cn()` helper, `data-slot`-free simple markup). Revisit using the CLI
  if it gains a non-interactive/preset-by-URL mode.
- `lucide-svelte` is deprecated upstream in favor of the scoped `@lucide/svelte` package;
  used the latter. A few icon names changed too (`Home` → `House`, `MoreHorizontal` →
  `Ellipsis`).
- CSP is configured via SvelteKit's own `kit.csp` (nonce mode) in `svelte.config.js`, not a
  hand-rolled header in `hooks.server.ts`: SvelteKit's own inline hydration bootstrap script
  needs a nonce it generates internally and doesn't expose to user code, so hand-rolling the
  header would either block hydration or require `unsafe-inline`. The mode-watcher no-FOUC
  theme script is inlined directly in `app.html` behind `%sveltekit.nonce%` (with
  `disableHeadScriptInjection` on `<ModeWatcher>`) so it shares the same nonce.
- Dark mode uses a `.dark` class on `<html>` (mode-watcher's default), not a `data-theme`
  attribute — `app.css`'s `@custom-variant dark` and `:root.dark` overrides follow suit.

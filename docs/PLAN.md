# Arnia — Execution Plan

This document is the working plan for building Arnia. It is updated as work progresses;
treat section 2 (task breakdown) as the source of truth for "what's left."

## 1. Pinned dependency versions

Verified against the npm registry on 2026-09-17 (MongoDB/Vercel rows 2026-11-16). Re-check before bumping.

| Package                         | Version  | Notes                                                                                                                 |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Node.js                         | 24.x     | Vercel runtime (engines.node)                                                                                         |
| pnpm                            | 12.4.2   | via corepack                                                                                                          |
| TypeScript                      | 6.0.3    | **not** 7.x — `typescript-eslint` requires `<6.1.0`; TS7 (native/tsgo) ecosystem support isn't there yet              |
| svelte                          | 5.57.0   | runes mode                                                                                                            |
| @sveltejs/kit                   | 2.70.3   |                                                                                                                       |
| @sveltejs/adapter-vercel        | 6.3.5    | Vercel serverless (Node runtime). 7.x needs SvelteKit 3                                                               |
| @sveltejs/vite-plugin-svelte    | 7.3.0    |                                                                                                                       |
| vite                            | 8.3.0    |                                                                                                                       |
| tailwindcss / @tailwindcss/vite | 4.3.3    | CSS-first config, no `tailwind.config.js`                                                                             |
| bits-ui                         | 2.19.2   | shadcn-svelte primitives                                                                                              |
| shadcn-svelte (CLI)             | 1.7.0    | init CLI requires an interactive preset picker (shadcn-svelte.com); components hand-built on bits-ui instead — see §4 |
| @lucide/svelte                  | 1.47.0   | `lucide-svelte` is deprecated in favor of this scoped package                                                         |
| tailwind-variants               | 3.3.1    | component variant styling (shadcn-svelte convention)                                                                  |
| @fontsource/inter               | 5.3.0    | self-hosted font                                                                                                      |
| mongodb (driver)                | 7.9.0    | MongoDB Atlas; also used by Better Auth's mongodbAdapter (string UUID ids)                                            |
| better-auth                     | 1.7.5    |                                                                                                                       |
| resend                          | 6.28.1   |                                                                                                                       |
| nodemailer                      | 10.0.10  | SMTP fallback provider                                                                                                |
| zod                             | 4.6.5    |                                                                                                                       |
| sveltekit-superforms            | 2.30.2   | zod4 adapter                                                                                                          |
| formsnap                        | 2.0.1    |                                                                                                                       |
| @inlang/paraglide-js            | 2.25.4   | v2 — own Vite plugin, no separate `-sveltekit` package                                                                |
| @vite-pwa/sveltekit             | 1.1.0    |                                                                                                                       |
| swissqrbill                     | 4.4.1    |                                                                                                                       |
| pdfkit                          | 0.20.2   |                                                                                                                       |
| @zxing/browser                  | 0.2.1    |                                                                                                                       |
| imapflow                        | 2.0.5    |                                                                                                                       |
| mailparser                      | 3.9.28   |                                                                                                                       |
| sharp                           | 0.35.4   | thumbnails                                                                                                            |
| @aws-sdk/client-s3              | 3.1169.0 | Cloudflare R2 (S3 API) client for attachment storage — see docs/storage-r2.md                                         |
| svelte-sonner                   | 1.2.3    | toasts (shadcn-svelte's toast component) — every form action's success/error feedback                                 |
| qrcode                          | 1.5.4    | TOTP setup QR code (2FA), rendered server-side as a data URL                                                          |
| vitest                          | 5.0.1    |                                                                                                                       |
| eslint                          | 10.10.0  | flat config                                                                                                           |
| typescript-eslint               | 8.70.0   |                                                                                                                       |
| eslint-plugin-svelte            | 3.23.0   |                                                                                                                       |
| prettier                        | 3.9.7    |                                                                                                                       |
| svelte-check                    | 4.7.6    |                                                                                                                       |
| pino                            | 10.3.1   | structured logging                                                                                                    |
| web-push                        | 3.6.7    | phase 11 only                                                                                                         |

## 2. Phase checklist

- [x] Phase 0 — this plan
- [x] Phase 1 — Foundation
- [x] Phase 2 — Auth, email & RBAC
- [ ] Phase 3 — Inventory
- [ ] Phase 4 — Events
- [ ] Phase 5 — Finance
- [ ] Phase 6 — Contacts & Swiss QR-bill invoices
- [ ] Phase 7 — Notifications & PWA
- [ ] Phase 8 — Email ingestion
- [ ] Phase 9 — Dashboard, search, settings, data export
- [ ] Phase 10 — Hardening & release (v0.1.0)
- [ ] Phase 11 — Optional Web Push

Each phase ends with: lint + check + unit tests green, the changed flows clicked through on
`pnpm dev` against a dev database, `CHANGELOG.md` updated, commit (Vercel deploys main).

## 3. Data model draft

**MongoDB (Atlas)** since 2026-11-16 — the entities below were drafted as SQL tables; each is
now a collection with a string UUID `_id` (document shapes: `src/lib/server/db/types.ts`).
Join tables are embedded where it's simpler (`role.permissions: string[]` replaces
`role_permission`); `user_role` stays a collection with `_id = userId:roleId`. Field names are
camelCase in documents.

Money = integer minor units + `currency` (3-letter code). Timestamps = `Date`.
All business documents carry `createdAt`, `updatedAt`; mutable domain documents carry
`createdBy`/`updatedBy` where useful for audit.

### Core / platform

Implemented as of Phase 2, in `src/lib/server/db/schema/{organization,auth,rbac}.ts`:

- **organization** (singleton row, Phase 1): name, address fields (street, house_no,
  postal_code, town, country), email, phone, website, logo_path, iban, is_qr_iban,
  default_currency, timezone, default_locale, enabled_locales[], vat_enabled, vat_number,
  terminology (jsonb, e.g. event label override), fiscal_year_start_month,
  invoice_number_pattern, invoice_default_due_days, setup_completed_at.
- **user** / **session** / **account** / **verification** / **two_factor** — Better Auth's own
  tables, hand-adapted from `pnpm exec better-auth generate` output (see `schema/auth.ts`'s
  header comment). `user` carries our `locale` and `is_active` additional fields;
  `notification_preference` is separate (Phase 7).
- **role**: id, key, name (admin-editable free text, seeded in Italian), description,
  is_system (seeded roles can be edited but not deleted).
- **role_permission**: role_id, permission_key (text, matches the code-defined `Permission`
  union in `src/lib/server/auth/permissions.ts` — not a DB enum).
- **user_role**: user_id, role_id (composite PK; a user's effective permissions are the union
  across all their roles).
- **invitation**: email, role_ids (jsonb), token_hash (sha256 of the emailed token, never
  stored plaintext), invited_by, expires_at, accepted_at. Also used for admin-initiated
  password resets of an existing email — see §4 decisions log.
- **activity_event** (outbox): id, type, entity_type, entity_id, actor_user_id, event_id
  (nullable, no FK yet — deferred to Phase 4), payload (jsonb), created_at. Feeds audit log +
  notifications (both still Phase 7+; the table exists but nothing reads it yet).
- **email_log**: id, to, template, status (queued/sent/failed), error, created_at (no body).

Not yet implemented (later phases): **event_team_member** (Phase 4, needs `event`),
**audit_log** viewer (Phase 9, reads `activity_event`), **notification** /
**notification_preference** (Phase 7).

### Inventory

- **location**: id, parent_id (self-ref), name, kind (site/room/shelf).
- **inventory_category**: id, parent_id, name.
- **item**: id, name, description, category_id, location_id, unit, sku, barcode, type
  (consumable/equipment), min_threshold, supplier, notes, avg_cost_minor, current_qty
  (cached), equipment_tracking (unit/quantity), purchase_value_minor, usage_cost_minor,
  condition (for single-unit equipment).
- Item photos: no separate table — `attachment` rows with `entity_type = 'item'` (the oldest
  image is the cover). See §4.
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
  `path` / `thumbnail_path` are Cloudflare R2 object keys (`{year}/{entity_type}/{id}.{ext}`).

Document types are added per phase to `src/lib/server/db/types.ts` (and typed accessors to
`collections` in `db/index.ts`, indexes to `ensureIndexes`) as each module is implemented.

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
- **Phase 2 decisions:**
  - `event_team_member` (event-scoped roles) is deferred to Phase 4: it needs the `event`
    table, which doesn't exist yet. Core RBAC (role/role_permission/user_role, multi-role
    users) is fully built in Phase 2 as planned; only the event-scoped slice moves.
  - No public self-registration exists or is planned: every account is created either by the
    setup wizard (first admin, gated on "zero users exist yet") or by redeeming an invitation.
    `user.validateUserInfo` enforces this even against a raw POST to
    `/api/auth/sign-up/email` by requiring a matching pending invitation.
  - Any module reachable from `src/worker.ts` (run via plain `tsx`, not through Vite) must not
    import `$env/*` — it's a Vite-only virtual module and throws `ERR_MODULE_NOT_FOUND` outside
    the SvelteKit pipeline. `src/lib/server/db/index.ts`, `email/index.ts` and `jobs/queue.ts`
    all use plain `process.env` instead, so they work in both the `app` and `worker` processes.
    (`$lib/*` aliases do resolve fine under `tsx` via tsconfig paths — only `$env/*` doesn't.)
  - The `invitation` table doubles as "set/reset password for an existing email": inviting an
    email that already has an account lets that user choose a new password through the same
    accept-invite link, redeemed via `redeemInvitationForExistingUser`. Self-service "forgot
    password" only exists when a real email provider is configured (spec §5: the flow can't
    safely show the reset link in-browser); with `EMAIL_PROVIDER=none`, an admin resets a
    user's password directly instead (`resetUserPasswordByAdmin`, using `better-auth/crypto`'s
    `hashPassword` to write the `account.password` column directly, then revoking sessions) and
    shows the generated temporary password once, out of band — mirroring how a temp password
    reset works in most systems.
  - Better Auth's `enableTwoFactor` doesn't set `user.twoFactorEnabled` until the first
    `verifyTOTP` call succeeds (the `two_factor` row starts `verified: false`) — the settings
    UI's "enable" step must show the QR code and hold in a pending state, not assume success
    immediately.
  - TOTP QR codes are generated server-side (`qrcode` → PNG data URL) from the `totpURI` Better
    Auth returns, never shipped to the client as a raw secret needing client-side rendering.
  - **`docker build` needs _some_ `DATABASE_URL`/`BETTER_AUTH_SECRET` present, even though
    they're only real at runtime.** SvelteKit's production build does a post-build "route
    analysis" pass that actually _imports_ every server module to inspect its exports — by
    Phase 2 that transitively imports `src/lib/server/db` (throws immediately if
    `DATABASE_URL` is unset) and `src/lib/server/auth` (Better Auth refuses to construct
    without a real `secret` when `NODE_ENV=production`). Fixed two ways: `db/index.ts` now
    creates its Postgres connection lazily behind a `Proxy`, on first real use, instead of at
    module load — the more robust fix, since it also means `pnpm build` works locally with no
    `.env` at all. Better Auth's construction can't be made lazy the same way (its returned
    object's shape matters for type inference throughout the app), so the `build` stage of the
    `Dockerfile` sets harmless placeholder `ENV DATABASE_URL=`/`BETTER_AUTH_SECRET=` values —
    these apply only within that build stage, never copied into the runtime stage or its image,
    and are always overridden by docker-compose's real environment at container start.
  - **The `worker` container crash-looped in production** (`ERR_MODULE_NOT_FOUND: Cannot find
package '$lib'`) once `src/worker.ts` grew real imports in Phase 2. Two compounding causes,
    both now fixed: (1) the runtime image only ever copied `worker.ts` and `migrate.ts` as
    loose files, never the `src/lib/server/**` modules they import — the Dockerfile now copies
    the whole `src/lib/server` directory instead; (2) `$lib/*` is a SvelteKit/Vite alias
    resolved via tsconfig paths, which plain `tsx` can resolve in a full checkout (dev, CI) but
    has no reason to work from a stripped-down image that ships no tsconfig at all. Fixed at
    the source: `worker.ts` and everything it imports (`jobs/queue.ts`,
    `jobs/handlers/send-email.ts`) now use relative imports, so this dependency chain doesn't
    need path-alias resolution to work anywhere. Caught by actually restarting the running
    Docker Compose stack after the Phase 2 auth/RBAC changes, not by any automated test — a
    successful `docker build` never exercises the containers, so it can't catch a crash loop.
    The `docker-build` CI job now brings the stack up for real (`db`, `app`, `worker`) after
    building and polls `docker compose ps` until `app` reports healthy or any service starts
    restarting/exits, failing the job (with logs) either way — see `.github/workflows/ci.yml`.
- **Phase 3 decisions:**
  - `stock_movement.type: 'adjustment'` is the only bidirectional movement type — it corrects
    stock either up or down (found more/less than expected during a count or spot-check), unlike
    every other type which has a fixed sign. `recordMovement`/`signedDelta` take an optional
    `direction: 'increase' | 'decrease'` (default `'increase'`) used only for this type; the
    manual movement form exposes it as a select shown only when `type === 'adjustment'`. The
    inventory-count flow (`/inventory/count`) always passes an explicit direction, computed from
    `countedQty - currentQty`.
  - `/inventory/scan` and `/inventory/count` both load the full non-archived item list once
    (id/name/sku/barcode/unit/qty) and do lookup/filtering client-side, rather than adding a
    dedicated search endpoint — the same pattern already used by `/inventory/movements/new`.
    Fine at the expected scale of a non-profit's inventory; revisit with a real search endpoint
    if item counts grow large enough to matter.
  - `@zxing/browser`'s `BrowserMultiFormatReader` is imported dynamically inside `onMount`, not
    at module scope, so the scan page never touches camera/`MediaDevices` APIs during SSR.
    Camera permission denial (or no camera) falls back to the always-visible manual search
    section rather than blocking the page.
  - **Found via the new inventory e2e specs, not by inspection:** on mobile viewports, a
    right-aligned (`justify-end`) lone submit button at the end of a form can end up directly
    under the fixed quick-action FAB (`bottom-right`, present on every `(app)`-layout page),
    intercepting the tap/click. This was already latent in Phase 2's settings pages
    (`settings/users`, `settings/roles`) — it just had no test exercising a mobile submit at that
    scroll position until now. Fixed everywhere by centering the button (full-width) on mobile
    and right-aligning only from `sm:` up: `justify-center sm:justify-end` on the wrapper, plus
    `w-full sm:w-auto` on the button. `setup/*` pages are unaffected (their layout has no FAB).
- **UX feedback & R2 storage decisions:**
  - **Every form goes through `createSubmit()`** (`src/lib/client/submit.svelte.ts`): pending
    state (`<Button loading>`), optional confirmation (`confirmDialog`, one
    `<ConfirmDialogHost>` in the root layout), and a toast (`svelte-sonner`, one `<Toaster>` in
    the root layout) for success / `fail()` / crash. Success toasts are shown on `redirect`
    results too — before `update()` navigates — so create/edit flows get feedback without a
    flash-cookie library. `type: 'error'` results (403, network down) toast and stay on the
    page instead of swapping to the error page over a button press. Per-row forms share one
    instance and use `isPending(id)` (keyed on the `id` field, or `keyField`).
  - Field errors are rendered via `FieldError` with localized messages per field; Zod's English
    messages are never shown to users. Error pages (`+error.svelte`) are localized per status.
  - A thin navigation progress bar (`navigating` from `$app/state`) appears after 150 ms so
    fast navigations don't flicker.
  - **Attachments live in Cloudflare R2 only** (decided with the maintainer: no local-disk
    driver). Uploads go through the app (browser-side `compressImage` → form action → magic-byte
    check + sharp thumbnail → `PutObject`); downloads are streamed through `/attachments/[id]`
    after `canAccessAttachment`. The bucket stays private, CSP is unchanged (same-origin), and
    no R2 CORS config is needed. The S3 client is created lazily on first use, so builds need no
    R2 credentials. The nightly `backup` service no longer covers files — see
    `docs/storage-r2.md` ("Backups").
  - `item_photo` from the schema draft was dropped: `attachment` is already polymorphic, so a
    join table added nothing.
  - Stock-count movements store the marker `inventory_count` as their `reason` (translated at
    display time via `movementReasonLabel`) instead of English text.
- **Platform switch (2026-11-16): Vercel + MongoDB Atlas, no Docker/Postgres/CI.** Decided by
  the maintainer. Consequences:
  - Drizzle/Postgres → official `mongodb` driver (no ODM): typed `collections`, explicit
    `withTransaction` for multi-document writes (Atlas clusters are replica sets), no
    migrations (indexes ensured per cold start). Better Auth uses `mongodbAdapter` with
    `generateId: () => crypto.randomUUID()` so its ids are strings like ours.
  - `SELECT … FOR UPDATE` in `recordMovement` → plain read + update inside a transaction:
    concurrent movements on one item make one transaction hit a write conflict, which the
    driver retries with fresh data (verified: 5 parallel consumptions → exact stock).
  - pg-boss + `src/worker.ts` removed: emails are sent inline (`email/send.ts`, logged to
    `email_log`). Future scheduled jobs → Vercel Cron routes.
  - Docker, Caddy, backup/restore scripts, Playwright e2e and the GitHub Actions workflow
    removed. Backups: Atlas (database) + bucket mirror (R2, see `docs/storage-r2.md`).
  - Vercel's 4.5 MB body limit → photo uploads capped at 4 MB (compressed client-side, one
    request per photo). Item attachments are images only.
  - Builds need no secrets: Mongo/R2 clients are lazy, Better Auth gets a placeholder secret
    while `building`. The Docker-era notes above (worker imports, build-time placeholder ENV,
    crash-looping container) are historical.

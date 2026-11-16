# Deploying Arnia: Vercel + MongoDB Atlas

Arnia runs as a SvelteKit app on **Vercel** (serverless functions, `@sveltejs/adapter-vercel`)
with data in **MongoDB Atlas** and item photos in **Cloudflare R2**. There is no server to
maintain, no Docker, and no migration step: collections and indexes are created on first use.

You need:

- a MongoDB Atlas cluster (the free M0 tier is fine to start)
- a Vercel account connected to the GitHub repository
- optional: an R2 bucket for photos ([`storage-r2.md`](storage-r2.md)) and an email provider
  (Resend or SMTP)

---

## 1. MongoDB Atlas

1. **Database user:** Atlas → _Database Access_ → _Add New Database User_. Choose password
   authentication and the role _Read and write to any database_ (or scope it to the `arnia`
   database). Save the username and password.
2. **Network access:** Atlas → _Network Access_ → _Add IP Address_ → **Allow access from
   anywhere** (`0.0.0.0/0`). Vercel functions don't have fixed IP addresses, so this is the
   standard setup for Vercel + Atlas; the database user's password is what protects the data.
   Use a long, random password.
3. **Connection string:** your cluster → _Connect_ → _Drivers_. It looks like
   `mongodb+srv://<db_username>:<db_password>@cluster-ghila.zrsoj.mongodb.net/`. Replace the
   two placeholders. If the password contains special characters (`@ : / ? # [ ] %`),
   URL-encode them (for example `@` becomes `%40`).

Database name: `arnia`, set separately in `MONGODB_DB`. For local development, use a different
name (for example `arnia_dev`) on the same cluster, so testing never touches real data.

> Transactions are used for stock movements and other multi-step writes. Every Atlas cluster,
> including the free tier, is a replica set, so they work out of the box.

## 2. Vercel

1. _Add New… → Project_ → import the GitHub repository. Vercel detects SvelteKit and pnpm on its
   own, so leave the build settings at their defaults.
2. **Environment variables** (_Settings → Environment Variables_). Add these for _Production_
   (and _Preview_ if you use preview deployments):

   | Variable                | Value                                                                  |
   | ----------------------- | ---------------------------------------------------------------------- |
   | `MONGODB_URI`           | the connection string from step 1                                      |
   | `MONGODB_DB`            | `arnia`                                                                |
   | `BETTER_AUTH_SECRET`    | output of `openssl rand -base64 32`                                    |
   | `BETTER_AUTH_URL`       | your production URL, e.g. `https://arnia.vercel.app` (no trailing `/`) |
   | `APP_ENCRYPTION_KEY`    | output of `openssl rand -base64 32`                                    |
   | `EMAIL_PROVIDER`        | `none` to start (admins copy invite links), or `resend` / `smtp`       |
   | `R2_*`, `MAX_UPLOAD_MB` | see [`storage-r2.md`](storage-r2.md); `MAX_UPLOAD_MB=4`                |

   Don't reuse your local `.env` secrets in production. Generate new ones.

3. **Function region** (_Settings → Functions → Function Region_): pick the region closest to
   your Atlas cluster (for example _Frankfurt, fra1_ for an Atlas cluster in `eu-central-1`).
   Every page load queries the database, so this makes the biggest difference to speed.
4. **Deploy.** Open the URL: you'll land on the first-run setup wizard, which creates the admin
   account, the organization and the default roles.

Each push to the main branch deploys automatically. There's no separate CI: run
`pnpm check && pnpm lint && pnpm test:unit` locally before pushing.

## 3. Custom domain (optional)

Vercel → _Settings → Domains_. After adding it, update `BETTER_AUTH_URL` to the new domain and
redeploy. Sign-in links and cookies use this URL.

## Limits to know about

- **Uploads:** Vercel rejects request bodies over 4.5 MB. Photos are resized in the browser
  (to about 2400 px JPEG, usually 300–800 KB) and sent one per request, so this is not an
  issue in practice. `MAX_UPLOAD_MB` is capped at 4 regardless.
- **No background worker:** emails are sent during the request that triggers them, and logged
  in the `email_log` collection. Later features that need schedules (reminders, mailbox
  polling) will use [Vercel Cron](https://vercel.com/docs/cron-jobs).
- **Preview deployments** have their own URLs. Signing in there only works if
  `BETTER_AUTH_URL` (Preview environment) matches that URL. Usually it's simplest to test on
  production or locally.

## Local development

```bash
pnpm install
cp .env.example .env        # MONGODB_URI, MONGODB_DB=arnia_dev, BETTER_AUTH_SECRET
pnpm dev                    # http://localhost:5173
```

`BETTER_AUTH_URL=http://localhost:5173` locally. `pnpm dev` reads `.env` directly.

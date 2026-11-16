# File storage: setting up Cloudflare R2

Arnia stores item photos in a **private**
[Cloudflare R2](https://developers.cloudflare.com/r2/) bucket. Users never talk to R2 directly:
the browser uploads to Arnia, and Arnia checks permissions and then streams each file back from
`/attachments/<id>`. This means:

- the bucket **stays private**: no public URL and no custom domain
- **no CORS configuration** is needed
- the app's Content-Security-Policy doesn't change

Setup takes about five minutes. You need a Cloudflare account with R2 enabled and a bucket.

---

## 1. Check the bucket

Cloudflare dashboard → **R2 Object Storage** → your bucket → **Settings**.

- **Public access** (the `r2.dev` URL and custom domains) must stay **disabled**. Arnia serves
  files itself, after checking that the viewer is allowed to see them. A public bucket would
  bypass that check.
- Note the bucket's **Location / Jurisdiction**. If the bucket was created with the **EU**
  jurisdiction (a sensible choice for a Swiss/EU association), its endpoint is different, and you
  will set `R2_JURISDICTION=eu` in step 4. A bucket without a jurisdiction (only a location hint
  such as "Western Europe") needs nothing extra.

> A jurisdiction can't be added to an existing bucket. If you want your files guaranteed to stay
> in the EU and the bucket has no jurisdiction, create a new bucket with **Specify jurisdiction →
> European Union** before uploading anything.

## 2. Find your Account ID

**R2 Object Storage → Overview**. The right-hand panel, **Account details**, shows:

- **Account ID**: a 32-character hex string. You need it in step 4.
- **S3 API**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Arnia builds this endpoint itself,
  so you don't need to copy it.

## 3. Create an API token for Arnia

**R2 Object Storage → Overview → Account details → API Tokens → Manage → Create API token**
(either an _Account API token_ or a _User API token_ works; an Account token survives you
leaving the organisation, so prefer that one).

| Setting             | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Token name          | e.g. `arnia-production`                                   |
| Permissions         | **Object Read & Write**                                   |
| Specify bucket(s)   | **Apply to specific buckets only** → select _your bucket_ |
| TTL                 | Forever (or set a reminder to rotate it)                  |
| Client IP filtering | Optional: your server's public IP, if it is static        |

Click **Create API Token**. The next page is shown **only once**. Copy:

- **Access Key ID** → `R2_ACCESS_KEY_ID`
- **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

Ignore the **Token value** at the top of that page: it is for Cloudflare's own REST API, not for
the S3 API that Arnia uses.

> Least privilege: "Object Read & Write" on one bucket is all Arnia needs. Don't use an "Admin"
> token. Arnia never creates or deletes buckets.

## 4. Configure Arnia

Locally in `.env`, and in production in **Vercel → Settings → Environment Variables**
(the same names):

```dotenv
R2_ACCOUNT_ID=0123456789abcdef0123456789abcdef
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=arnia
# Only if the bucket has a jurisdiction (step 1): eu (or fedramp). Otherwise leave empty.
R2_JURISDICTION=

# Largest single photo upload, in MB (capped at 4: Vercel rejects bodies over 4.5 MB).
# Photos are compressed in the browser first (to ~2400 px JPEG), usually under 1 MB.
MAX_UPLOAD_MB=4
```

### Development

Create a **second bucket** (e.g. `arnia-dev`) with **its own token** scoped only to it, and use
those values in your local `.env`. Local development then never touches production photos.

## 5. Verify

```bash
pnpm storage:check
```

It uses the `R2_*` values in your local `.env`. To check the production values, run it once
with those values in `.env`, or simply add a photo to an item after deploying. After changing
environment variables in Vercel, **redeploy** (Deployments → ⋯ → Redeploy) so they take effect.

The check writes, reads back and deletes a small probe object. When everything is set up
correctly you'll see:

```
Endpoint: https://<account>.r2.cloudflarestorage.com
Bucket:   arnia
✓ write
✓ read
✓ delete

OK — R2 storage is configured correctly.
```

When something is wrong, the check prints the likely cause:

| Error                                          | Usual cause                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `StorageNotConfiguredError: missing …`         | A variable from step 4 is empty, or `.env` isn't where the command expects it. |
| `NoSuchBucket`                                 | Bucket name typo, **or** an EU bucket without `R2_JURISDICTION=eu`.            |
| `InvalidAccessKeyId` / `SignatureDoesNotMatch` | Wrong key pair. Re-copy it. The "Token value" is _not_ the secret access key.  |
| `AccessDenied` / 403                           | The token lacks "Object Read & Write", or isn't scoped to this bucket.         |
| `ENOTFOUND`                                    | Wrong `R2_ACCOUNT_ID`/`R2_JURISDICTION`, or the server has no outbound HTTPS.  |

Finally, open any item in Arnia, tap **Add photo**, and pick a photo. It should appear in the grid
within a couple of seconds.

## Costs

R2's free tier includes 10 GB of storage plus generous monthly request quotas, and R2 charges
**nothing for egress** (downloads). Photos are resized in the browser before upload, typically to
300–800 KB each, so an association with a few thousand photos stays well within the free tier.
Check Cloudflare's [current pricing](https://developers.cloudflare.com/r2/pricing/) for exact
figures.

## Backups

Database backups (Atlas, see `README.md`) don't include files: those live only in R2. Cloudflare stores objects redundantly, but that doesn't protect against deleting a photo by
mistake or losing the account. To keep your own copy, mirror the bucket on a schedule from any
machine with [rclone](https://rclone.org/s3/#cloudflare-r2):

```bash
# one-time: `rclone config` → new remote "r2", type s3, provider Cloudflare,
#           using a *read-only* R2 token and the same endpoint as Arnia
rclone sync r2:arnia /path/to/backups/r2-arnia
```

Database rows reference files by object key (`2026/item/<uuid>.jpg`), so a database backup
restored together with a bucket mirror taken at about the same time gives you a consistent
snapshot.

## How it works (for maintainers)

- `src/lib/server/storage/r2.ts`: the S3 client (lazy, worker-safe), `putObject`,
  `getObjectStream`, `deleteObjects`.
- `src/lib/server/storage/index.ts`: `saveAttachment` (magic-byte validation, sharp thumbnail,
  upload, DB row in one transaction; uploaded objects are removed again if the DB write fails)
  and `deleteAttachment`.
- `src/routes/attachments/[id]/+server.ts`: permission check (`canAccessAttachment`), then
  streams the object. `?size=thumb` serves the 400 px thumbnail.
- `src/lib/server/services/item-photos.ts`: item-specific rules (size limit, 20 files per item,
  activity events).

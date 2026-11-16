import {
	DeleteObjectsCommand,
	GetObjectCommand,
	NoSuchKey,
	PutObjectCommand,
	S3Client,
	S3ServiceException
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 object storage — the only place attachment bytes live (see
 * `docs/storage-r2.md` for setup). R2 speaks the S3 API, so this is a thin
 * wrapper around `@aws-sdk/client-s3`.
 *
 * Relative imports and `process.env` only (no `$env`/`$lib`), so scripts
 * like `storage:check` run it under plain `tsx`. The client is created
 * lazily on first use, so `vite build` (which imports every server module
 * once) never needs real R2 credentials.
 */

export class StorageNotConfiguredError extends Error {
	constructor(missing: string[]) {
		super(`R2 storage is not configured: missing ${missing.join(', ')} (see docs/storage-r2.md)`);
		this.name = 'StorageNotConfiguredError';
	}
}

export interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	/** `eu` / `fedramp` for jurisdiction-restricted buckets; empty otherwise. */
	jurisdiction: string;
}

const REQUIRED = [
	'R2_ACCOUNT_ID',
	'R2_ACCESS_KEY_ID',
	'R2_SECRET_ACCESS_KEY',
	'R2_BUCKET'
] as const;

export function readR2Config(env: Record<string, string | undefined> = process.env): R2Config {
	const missing = REQUIRED.filter((key) => !env[key]?.trim());
	if (missing.length > 0) throw new StorageNotConfiguredError(missing);
	return {
		accountId: env.R2_ACCOUNT_ID!.trim(),
		accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
		secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
		bucket: env.R2_BUCKET!.trim(),
		jurisdiction: env.R2_JURISDICTION?.trim().toLowerCase() ?? ''
	};
}

/**
 * Jurisdiction-restricted buckets (e.g. created with "EU") are only
 * reachable through their own endpoint — using the default one returns
 * `NoSuchBucket`.
 */
export function r2Endpoint(config: Pick<R2Config, 'accountId' | 'jurisdiction'>): string {
	const jurisdiction = config.jurisdiction ? `.${config.jurisdiction}` : '';
	return `https://${config.accountId}${jurisdiction}.r2.cloudflarestorage.com`;
}

let cached: { client: S3Client; bucket: string } | null = null;

function r2(): { client: S3Client; bucket: string } {
	if (cached) return cached;
	const config = readR2Config();
	cached = {
		bucket: config.bucket,
		client: new S3Client({
			region: 'auto', // required by the SDK, ignored by R2
			endpoint: r2Endpoint(config),
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey
			}
		})
	};
	return cached;
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
	const { client, bucket } = r2();
	await client.send(
		new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
	);
}

export interface ObjectStream {
	stream: ReadableStream<Uint8Array>;
	size: number | undefined;
	etag: string | undefined;
}

/** Streams an object's body, or `null` if it doesn't exist. */
export async function getObjectStream(key: string): Promise<ObjectStream | null> {
	const { client, bucket } = r2();
	try {
		const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
		if (!res.Body) return null;
		return {
			stream: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
			size: res.ContentLength,
			etag: res.ETag
		};
	} catch (err) {
		if (err instanceof NoSuchKey) return null;
		if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) return null;
		throw err;
	}
}

export async function deleteObjects(keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	const { client, bucket } = r2();
	await client.send(
		new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true }
		})
	);
}

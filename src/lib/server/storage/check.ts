/* eslint-disable no-console -- CLI script: progress output is the point */
/**
 * `pnpm storage:check` — verifies the R2 configuration end to end by
 * writing, reading back and deleting a small probe object, then prints
 * either OK or what is most likely wrong. Uses the R2_* values from `.env`
 * (the same ones you set in Vercel).
 */
import { S3ServiceException } from '@aws-sdk/client-s3';
import {
	deleteObjects,
	getObjectStream,
	putObject,
	r2Endpoint,
	readR2Config,
	StorageNotConfiguredError
} from './r2';

function hint(err: unknown): string {
	if (err instanceof StorageNotConfiguredError) {
		return 'Set the missing variables in .env (see docs/storage-r2.md, step 4).';
	}
	if (err instanceof S3ServiceException) {
		switch (err.name) {
			case 'NoSuchBucket':
				return 'Bucket not found. Check R2_BUCKET — and if the bucket was created with a jurisdiction (e.g. EU), set R2_JURISDICTION=eu.';
			case 'InvalidAccessKeyId':
			case 'SignatureDoesNotMatch':
				return 'Credentials rejected. Re-copy R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (not the "Token value") from the API token page.';
			case 'AccessDenied':
				return 'Access denied. The API token needs "Object Read & Write" and must include this bucket.';
		}
		if (err.$metadata.httpStatusCode === 403) {
			return 'Access denied. The API token needs "Object Read & Write" and must include this bucket.';
		}
	}
	if (err instanceof Error && /ENOTFOUND|getaddrinfo/.test(err.message)) {
		return 'Endpoint unreachable. Check R2_ACCOUNT_ID (and R2_JURISDICTION) and outbound network access.';
	}
	return 'Unexpected error — see the message above.';
}

async function main(): Promise<void> {
	const config = readR2Config();
	console.log(`Endpoint: ${r2Endpoint(config)}`);
	console.log(`Bucket:   ${config.bucket}`);

	const key = `_healthcheck/${crypto.randomUUID()}.txt`;
	const payload = new TextEncoder().encode(`arnia storage check ${new Date().toISOString()}`);

	await putObject(key, payload, 'text/plain');
	console.log('✓ write');

	const object = await getObjectStream(key);
	if (!object) throw new Error('Probe object vanished right after being written');
	const readBack = new Uint8Array(await new Response(object.stream).arrayBuffer());
	if (readBack.byteLength !== payload.byteLength) {
		throw new Error(`Read ${readBack.byteLength} bytes, expected ${payload.byteLength}`);
	}
	console.log('✓ read');

	await deleteObjects([key]);
	console.log('✓ delete');
	console.log('\nOK — R2 storage is configured correctly.');
}

main().catch((err: unknown) => {
	console.error(`\n✗ ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
	console.error(`  → ${hint(err)}`);
	process.exit(1);
});

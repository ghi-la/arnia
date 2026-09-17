/* eslint-disable no-console -- CLI script: progress output is the point */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Runs pending migrations, guarded by a Postgres advisory lock so that
 * multiple app instances starting concurrently (e.g. a rolling deploy)
 * don't race each other. Safe to call on every container start.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set');
}

// Arbitrary fixed key identifying "arnia migrations" for the advisory lock.
const LOCK_KEY = 8_192_004_002;

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

try {
	console.log('[migrate] waiting for advisory lock...');
	await client`select pg_advisory_lock(${LOCK_KEY})`;

	try {
		console.log('[migrate] running migrations...');
		await migrate(db, { migrationsFolder: './drizzle' });
		console.log('[migrate] done.');
	} finally {
		await client`select pg_advisory_unlock(${LOCK_KEY})`;
	}
} catch (err) {
	console.error('[migrate] failed:', err);
	await client.end();
	process.exit(1);
}

await client.end();

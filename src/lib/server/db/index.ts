import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Plain `process.env` (not `$env/dynamic/private`) so this module works both
// inside SvelteKit (the `app` process) and under plain `tsx` (the `worker`
// process, and `src/lib/server/db/migrate.ts`) — `$env/*` is a Vite-only
// virtual module and doesn't resolve outside the SvelteKit build pipeline.
//
// The connection itself is created lazily, on first actual use, rather than
// at module load: SvelteKit's production build imports every server module
// (its post-build route analysis) to inspect exports, which would otherwise
// make `docker build` (no DATABASE_URL at build time) fail before the
// container ever starts.
type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | undefined;

function getInstance(): Db {
	if (instance) return instance;

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set');
	}

	instance = drizzle(postgres(databaseUrl), { schema });
	return instance;
}

export const db: Db = new Proxy({} as Db, {
	get(_target, prop, receiver) {
		const value = Reflect.get(getInstance(), prop, receiver);
		return typeof value === 'function' ? value.bind(getInstance()) : value;
	}
});

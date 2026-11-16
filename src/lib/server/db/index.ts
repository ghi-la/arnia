import {
	MongoClient,
	type ClientSession,
	type Collection,
	type Db,
	type Document,
	type IndexDescription
} from 'mongodb';
import type {
	AccountDoc,
	ActivityEventDoc,
	AttachmentDoc,
	CategoryDoc,
	EmailLogDoc,
	InvitationDoc,
	ItemDoc,
	LocationDoc,
	OrganizationDoc,
	RoleDoc,
	SessionDoc,
	StockMovementDoc,
	UserDoc,
	UserRoleDoc
} from './types';

/**
 * MongoDB Atlas access. Configured with two env vars:
 *
 *   MONGODB_URI   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
 *   MONGODB_DB    database name (default `arnia`)
 *
 * Plain `process.env` (not `$env/*`) so scripts run under `tsx` too. The
 * client is created lazily on first use and cached on `globalThis`, so:
 *  - `vite build` (which imports every server module) never needs the URI;
 *  - warm Vercel function invocations and Vite HMR reloads reuse one
 *    connection pool instead of opening a new one each time.
 * The driver connects on the first operation — no explicit `connect()`.
 */
const globalCache = globalThis as unknown as {
	__arniaMongo?: { client: MongoClient; indexes?: Promise<void> };
};

function getClient(): MongoClient {
	if (globalCache.__arniaMongo) return globalCache.__arniaMongo.client;

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		throw new Error('MONGODB_URI is not set (see .env.example)');
	}

	const client = new MongoClient(uri, { appName: 'arnia', maxPoolSize: 10 });
	globalCache.__arniaMongo = { client };
	return client;
}

function getDb(): Db {
	const database = getClient().db(process.env.MONGODB_DB || 'arnia');
	// Fire-and-forget, once per process: idempotent, and failures only log —
	// a missing index must never take the app down.
	globalCache.__arniaMongo!.indexes ??= ensureIndexes(database).catch((err: unknown) => {
		console.error('[db] ensuring indexes failed:', err);
	});
	return database;
}

/** Lazily forwards every property access to the real object (see module comment). */
function lazy<T extends object>(get: () => T): T {
	return new Proxy({} as T, {
		get(_target, prop) {
			const target = get();
			const value = Reflect.get(target, prop, target);
			return typeof value === 'function' ? value.bind(target) : value;
		}
	});
}

export const client: MongoClient = lazy(getClient);
export const db: Db = lazy(getDb);

function collection<T extends Document>(name: string): () => Collection<T> {
	return () => db.collection<T>(name);
}

/**
 * Typed collections. Better Auth owns `user`, `session`, `account`,
 * `verification` and `twoFactor` (its default model names) — the app only
 * reads those, except for the documented direct writes in
 * `services/set-password.ts`.
 */
export const collections = {
	user: collection<UserDoc>('user'),
	session: collection<SessionDoc>('session'),
	account: collection<AccountDoc>('account'),
	organization: collection<OrganizationDoc>('organization'),
	role: collection<RoleDoc>('role'),
	userRole: collection<UserRoleDoc>('user_role'),
	invitation: collection<InvitationDoc>('invitation'),
	activityEvent: collection<ActivityEventDoc>('activity_event'),
	emailLog: collection<EmailLogDoc>('email_log'),
	location: collection<LocationDoc>('location'),
	category: collection<CategoryDoc>('inventory_category'),
	item: collection<ItemDoc>('item'),
	stockMovement: collection<StockMovementDoc>('stock_movement'),
	attachment: collection<AttachmentDoc>('attachment')
};

/**
 * Runs `fn` in a multi-document transaction (Atlas clusters are replica
 * sets, so transactions are always available). Pass `session` to every
 * operation inside — an operation without it runs outside the transaction.
 * The driver retries the whole callback on transient errors, so `fn` must
 * not have side effects outside the database (no emails, no R2 writes).
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
	const session = client.startSession();
	try {
		return await session.withTransaction(() => fn(session));
	} finally {
		await session.endSession();
	}
}

/** Mongo's duplicate-key error (unique index violation). */
export function isDuplicateKeyError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
}

async function ensureIndexes(database: Db): Promise<void> {
	const specs: Record<string, IndexDescription[]> = {
		role: [{ key: { key: 1 }, unique: true }],
		user_role: [{ key: { userId: 1 } }, { key: { roleId: 1 } }],
		invitation: [
			{ key: { tokenHash: 1 }, unique: true },
			{ key: { email: 1, acceptedAt: 1, expiresAt: 1 } }
		],
		activity_event: [{ key: { entityType: 1, entityId: 1 } }, { key: { createdAt: -1 } }],
		location: [{ key: { parentId: 1 } }],
		inventory_category: [{ key: { parentId: 1 } }],
		item: [
			{ key: { name: 1 } },
			{ key: { categoryId: 1 } },
			{ key: { locationId: 1 } },
			{ key: { barcode: 1 } }
		],
		stock_movement: [{ key: { itemId: 1, createdAt: -1 } }],
		attachment: [{ key: { entityType: 1, entityId: 1, createdAt: 1 } }]
	};
	await Promise.all(
		Object.entries(specs).map(([name, indexes]) => database.collection(name).createIndexes(indexes))
	);
}

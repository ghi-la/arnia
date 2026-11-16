/**
 * MongoDB document shapes. Every collection uses a string UUID `_id`
 * (`crypto.randomUUID()`) — the same scheme Better Auth is configured with
 * (`advanced.database.generateId`), so ids are plain strings everywhere,
 * in URLs and across collections. Services hand the rest of the app
 * entities with `id` instead of `_id` (see `toEntity`).
 *
 * Money is always integer minor units + a currency code (CLAUDE.md).
 */

/** A document as the app sees it: `_id` renamed to `id`. */
export type Entity<T extends { _id: string }> = Omit<T, '_id'> & { id: string };

export function toEntity<T extends { _id: string }>(doc: T): Entity<T> {
	const { _id, ...rest } = doc;
	return { ...rest, id: _id };
}

// --- Better Auth collections (managed by Better Auth; read here) -----------

export interface UserDoc {
	_id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
	twoFactorEnabled?: boolean | null;
	locale: string;
	isActive: boolean;
}

export interface AccountDoc {
	_id: string;
	accountId: string;
	providerId: string;
	userId: string;
	password?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface SessionDoc {
	_id: string;
	userId: string;
	token: string;
	expiresAt: Date;
}

// --- Organization -----------------------------------------------------------

/** Singleton: exactly one document, `_id: 'default'` (created by the setup wizard). */
export interface OrganizationDoc {
	_id: 'default';
	name: string;
	street: string;
	houseNumber: string;
	postalCode: string;
	town: string;
	country: string;
	email: string;
	phone: string | null;
	website: string | null;
	logoPath: string | null;
	iban: string | null;
	isQrIban: boolean;
	defaultCurrency: string;
	timezone: string;
	defaultLocale: string;
	enabledLocales: string[];
	terminology: Record<string, string>;
	vatEnabled: boolean;
	vatNumber: string | null;
	fiscalYearStartMonth: number;
	invoiceNumberPattern: string;
	invoiceDefaultDueDays: number;
	setupCompletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// --- RBAC -------------------------------------------------------------------

/** `permissions` are keys from `src/lib/server/auth/permissions.ts`, embedded (no join table). */
export interface RoleDoc {
	_id: string;
	key: string;
	name: string;
	description: string | null;
	isSystem: boolean;
	permissions: string[];
	createdAt: Date;
	updatedAt: Date;
}

/** `_id` is `${userId}:${roleId}`, which makes each assignment unique by construction. */
export interface UserRoleDoc {
	_id: string;
	userId: string;
	roleId: string;
}

export function userRoleId(userId: string, roleId: string): string {
	return `${userId}:${roleId}`;
}

export interface InvitationDoc {
	_id: string;
	email: string;
	roleIds: string[];
	tokenHash: string;
	invitedBy: string;
	expiresAt: Date;
	acceptedAt: Date | null;
	createdAt: Date;
}

/**
 * Outbox: every audited/notifiable domain event is appended here in the same
 * transaction as the mutation. The audit log and notifications will read it.
 */
export interface ActivityEventDoc {
	_id: string;
	type: string;
	entityType: string;
	entityId: string;
	actorUserId: string | null;
	eventId: string | null;
	payload: Record<string, unknown>;
	createdAt: Date;
}

export interface EmailLogDoc {
	_id: string;
	to: string;
	template: string;
	status: 'sending' | 'sent' | 'failed';
	error: string | null;
	createdAt: Date;
}

// --- Inventory --------------------------------------------------------------

export interface LocationDoc {
	_id: string;
	parentId: string | null;
	name: string;
	kind: 'site' | 'room' | 'shelf';
	createdAt: Date;
}

export interface CategoryDoc {
	_id: string;
	parentId: string | null;
	name: string;
	createdAt: Date;
}

export type ItemType = 'consumable' | 'equipment';
export type ItemCondition = 'ok' | 'needs_repair' | 'broken' | 'lost';

/**
 * Equipment condition applies to the item as a whole (not per physical
 * unit) — see docs/PLAN.md §4.
 */
export interface ItemDoc {
	_id: string;
	name: string;
	description: string | null;
	type: ItemType;
	categoryId: string | null;
	locationId: string | null;
	unit: string;
	sku: string | null;
	barcode: string | null;
	minThreshold: number;
	supplier: string | null;
	notes: string | null;
	/** Consumables: weighted average cost, updated on each purchase movement. */
	avgCostMinor: number;
	currency: string;
	/**
	 * Cached current stock, kept consistent with `stock_movement` in a
	 * transaction (`recordMovement`) — never written anywhere else.
	 */
	currentQty: number;
	equipmentTracking: 'unit' | 'quantity' | null;
	purchaseValueMinor: number | null;
	usageCostMinor: number | null;
	condition: ItemCondition | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export type MovementType =
	'purchase' | 'consumption' | 'checkout' | 'return' | 'adjustment' | 'disposal';

/** Append-only ledger; `qty` is signed (see `signedDelta`). */
export interface StockMovementDoc {
	_id: string;
	itemId: string;
	type: MovementType;
	qty: number;
	unitCostMinor: number | null;
	eventId: string | null;
	reason: string | null;
	conditionOnReturn: 'returned' | 'damaged' | 'lost' | null;
	createdBy: string | null;
	createdAt: Date;
}

// --- Attachments ------------------------------------------------------------

/**
 * Polymorphic file metadata (item photos, later receipts…). The bytes live in
 * Cloudflare R2: `path` / `thumbnailPath` are object keys
 * (`{year}/{entityType}/{id}.{ext}`). Served only via `/attachments/[id]`.
 */
export interface AttachmentDoc {
	_id: string;
	entityType: string;
	entityId: string;
	path: string;
	thumbnailPath: string | null;
	mime: string;
	size: number;
	originalName: string;
	uploadedBy: string | null;
	createdAt: Date;
}

export type Location = Entity<LocationDoc>;
export type InventoryCategory = Entity<CategoryDoc>;
export type Item = Entity<ItemDoc>;
export type Role = Entity<RoleDoc>;
export type Attachment = Entity<AttachmentDoc>;
export type Organization = Entity<OrganizationDoc>;

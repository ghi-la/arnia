import type { ClientSession } from 'mongodb';
import { collections, withTransaction } from '$lib/server/db';
import {
	toEntity,
	type ItemDoc,
	type MovementType,
	type StockMovementDoc
} from '$lib/server/db/types';
import type { ItemFormData } from './item-schema';

export type { MovementType } from '$lib/server/db/types';

export class InsufficientStockError extends Error {
	available: number;
	requested: number;

	constructor(available: number, requested: number) {
		super(`Insufficient stock: ${available} available, ${requested} requested`);
		this.name = 'InsufficientStockError';
		this.available = available;
		this.requested = requested;
	}
}

export class ItemNotFoundError extends Error {
	constructor(itemId: string) {
		super(`Item not found: ${itemId}`);
		this.name = 'ItemNotFoundError';
	}
}

export interface RecordMovementInput {
	itemId: string;
	type: MovementType;
	/** Always a positive magnitude — this function applies the correct sign per `type`. */
	qty: number;
	unitCostMinor?: number;
	eventId?: string;
	reason?: string;
	conditionOnReturn?: 'returned' | 'damaged' | 'lost';
	/** Only meaningful for `type: 'adjustment'`, which can correct stock either way. Defaults to 'increase'. */
	direction?: 'increase' | 'decrease';
	createdBy: string;
}

async function logActivity(
	session: ClientSession,
	event: { type: string; entityId: string; actorUserId: string; payload: Record<string, unknown> }
): Promise<void> {
	await collections.activityEvent().insertOne(
		{
			_id: crypto.randomUUID(),
			type: event.type,
			entityType: 'item',
			entityId: event.entityId,
			actorUserId: event.actorUserId,
			eventId: null,
			payload: event.payload,
			createdAt: new Date()
		},
		{ session }
	);
}

/**
 * The only way item stock/cost should ever change. Appends to the
 * append-only `stock_movement` ledger and updates the item's cached
 * `currentQty` (and, for consumables bought in, `avgCostMinor` via a
 * weighted average) in one transaction — spec §2.4.
 *
 * Concurrency: two movements on the same item at once make one transaction
 * hit a write conflict; the driver retries it from the top with the fresh
 * quantity, so the stock check below always sees committed data.
 */
export async function recordMovement(input: RecordMovementInput): Promise<void> {
	const {
		itemId,
		type,
		qty,
		unitCostMinor,
		eventId,
		reason,
		conditionOnReturn,
		direction,
		createdBy
	} = input;

	if (qty <= 0) {
		throw new Error('qty must be a positive magnitude — recordMovement applies the sign');
	}
	if ((type === 'adjustment' || type === 'disposal') && !reason) {
		throw new Error(`a reason is required for ${type} movements`);
	}

	await withTransaction(async (session) => {
		const current = await collections.item().findOne({ _id: itemId }, { session });
		if (!current) throw new ItemNotFoundError(itemId);

		const delta = signedDelta(type, qty, conditionOnReturn, direction);
		const newQty = current.currentQty + delta;

		if (newQty < 0) {
			throw new InsufficientStockError(current.currentQty, -delta);
		}

		const updates: Partial<ItemDoc> = { currentQty: newQty, updatedAt: new Date() };
		if (current.type === 'consumable' && type === 'purchase' && unitCostMinor != null) {
			updates.avgCostMinor = weightedAverageCost(
				current.currentQty,
				current.avgCostMinor,
				qty,
				unitCostMinor
			);
		}
		await collections.item().updateOne({ _id: itemId }, { $set: updates }, { session });

		const movement: StockMovementDoc = {
			_id: crypto.randomUUID(),
			itemId,
			type,
			qty: delta,
			unitCostMinor: type === 'purchase' ? (unitCostMinor ?? null) : null,
			eventId: eventId ?? null,
			reason: reason ?? null,
			conditionOnReturn: conditionOnReturn ?? null,
			createdBy,
			createdAt: new Date()
		};
		await collections.stockMovement().insertOne(movement, { session });

		const wasLow = current.currentQty <= current.minThreshold;
		const isLow = newQty <= current.minThreshold;
		if (isLow && !wasLow) {
			await logActivity(session, {
				type: 'inventory.low_stock',
				entityId: itemId,
				actorUserId: createdBy,
				payload: { itemName: current.name, currentQty: newQty, minThreshold: current.minThreshold }
			});
		}
	});
}

export function signedDelta(
	type: MovementType,
	qty: number,
	conditionOnReturn?: 'returned' | 'damaged' | 'lost',
	direction?: 'increase' | 'decrease'
): number {
	switch (type) {
		case 'purchase':
			return qty;
		case 'adjustment':
			// The only bidirectional type — used for both "found more than
			// expected" and "found less than expected" stock-count corrections.
			return direction === 'decrease' ? -qty : qty;
		case 'consumption':
		case 'checkout':
		case 'disposal':
			return -qty;
		case 'return':
			// A lost item never comes back to the shelf; the checkout's earlier
			// decrement stands. Returned/damaged items are physically back.
			return conditionOnReturn === 'lost' ? 0 : qty;
	}
}

/** `newAvgCost = (oldQty·oldAvgCost + purchaseQty·unitCost) / (oldQty + purchaseQty)`. */
export function weightedAverageCost(
	oldQty: number,
	oldAvgCostMinor: number,
	purchaseQty: number,
	unitCostMinor: number
): number {
	const totalQty = oldQty + purchaseQty;
	if (totalQty === 0) return unitCostMinor;
	return Math.round((oldQty * oldAvgCostMinor + purchaseQty * unitCostMinor) / totalQty);
}

export interface ItemListFilters {
	search?: string;
	categoryId?: string;
	locationId?: string;
	lowStockOnly?: boolean;
	includeArchived?: boolean;
}

function escapeRegex(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Items for list/picker screens, sorted by name, with category/location names resolved. */
export async function listItems(filters: ItemListFilters = {}) {
	const query: Record<string, unknown> = {};
	if (!filters.includeArchived) query.archivedAt = null;
	if (filters.search) {
		const re = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = [{ name: re }, { sku: re }, { barcode: re }];
	}
	if (filters.categoryId) query.categoryId = filters.categoryId;
	if (filters.locationId) query.locationId = filters.locationId;
	if (filters.lowStockOnly) query.$expr = { $lte: ['$currentQty', '$minThreshold'] };

	const [items, categories, locations] = await Promise.all([
		collections.item().find(query).sort({ name: 1 }).toArray(),
		collections
			.category()
			.find({}, { projection: { name: 1 } })
			.toArray(),
		collections
			.location()
			.find({}, { projection: { name: 1 } })
			.toArray()
	]);
	const categoryNames = new Map(categories.map((c) => [c._id, c.name]));
	const locationNames = new Map(locations.map((l) => [l._id, l.name]));

	return items.map((it) => ({
		...toEntity(it),
		categoryName: it.categoryId ? (categoryNames.get(it.categoryId) ?? null) : null,
		locationName: it.locationId ? (locationNames.get(it.locationId) ?? null) : null
	}));
}

export async function getItem(itemId: string) {
	const doc = await collections.item().findOne({ _id: itemId });
	return doc ? toEntity(doc) : null;
}

/** Item + category/location names + its latest movements, for the detail page. */
export async function getItemDetail(itemId: string, movementLimit = 50) {
	const doc = await collections.item().findOne({ _id: itemId });
	if (!doc) return null;

	const [category, loc, movements] = await Promise.all([
		doc.categoryId ? collections.category().findOne({ _id: doc.categoryId }) : null,
		doc.locationId ? collections.location().findOne({ _id: doc.locationId }) : null,
		collections
			.stockMovement()
			.find({ itemId })
			.sort({ createdAt: -1 })
			.limit(movementLimit)
			.toArray()
	]);

	const userIds = [...new Set(movements.map((mv) => mv.createdBy).filter((id) => id !== null))];
	const users = userIds.length
		? await collections
				.user()
				.find({ _id: { $in: userIds } }, { projection: { name: 1 } })
				.toArray()
		: [];
	const userNames = new Map(users.map((u) => [u._id, u.name]));

	return {
		item: toEntity(doc),
		categoryName: category?.name ?? null,
		locationName: loc?.name ?? null,
		movements: movements.map((mv) => ({
			id: mv._id,
			type: mv.type,
			qty: mv.qty,
			unitCostMinor: mv.unitCostMinor,
			reason: mv.reason,
			conditionOnReturn: mv.conditionOnReturn,
			createdAt: mv.createdAt,
			createdByName: mv.createdBy ? (userNames.get(mv.createdBy) ?? null) : null
		}))
	};
}

/** Archives (hides from active use) or restores an item, recording who did it. */
export async function setItemArchived(input: {
	itemId: string;
	archived: boolean;
	userId: string;
}): Promise<boolean> {
	const { itemId, archived, userId } = input;
	return withTransaction(async (session) => {
		const updated = await collections
			.item()
			.findOneAndUpdate(
				{ _id: itemId },
				{ $set: { archivedAt: archived ? new Date() : null, updatedAt: new Date() } },
				{ session, projection: { name: 1 } }
			);
		if (!updated) return false;

		await logActivity(session, {
			type: archived ? 'inventory.item_archived' : 'inventory.item_unarchived',
			entityId: itemId,
			actorUserId: userId,
			payload: { itemName: updated.name }
		});
		return true;
	});
}

/** Validated item fields as stored (the form's decimal helpers already converted to minor units). */
export type ItemValues = Omit<ItemFormData, 'purchaseValue' | 'usageCost'>;

function toItemValues(data: ItemFormData): ItemValues {
	const { purchaseValue: _pv, usageCost: _uc, ...values } = data;
	return values;
}

export async function createItem(data: ItemFormData, userId: string): Promise<string> {
	const values = toItemValues(data);
	const id = crypto.randomUUID();
	const now = new Date();
	await withTransaction(async (session) => {
		await collections.item().insertOne(
			{
				_id: id,
				...values,
				avgCostMinor: 0,
				currency: 'CHF',
				currentQty: 0,
				archivedAt: null,
				createdAt: now,
				updatedAt: now
			},
			{ session }
		);
		await logActivity(session, {
			type: 'inventory.item_created',
			entityId: id,
			actorUserId: userId,
			payload: { itemName: values.name }
		});
	});
	return id;
}

export async function updateItem(
	itemId: string,
	data: ItemFormData,
	userId: string
): Promise<boolean> {
	const values = toItemValues(data);
	return withTransaction(async (session) => {
		const result = await collections
			.item()
			.updateOne({ _id: itemId }, { $set: { ...values, updatedAt: new Date() } }, { session });
		if (result.matchedCount === 0) return false;
		await logActivity(session, {
			type: 'inventory.item_updated',
			entityId: itemId,
			actorUserId: userId,
			payload: { itemName: values.name }
		});
		return true;
	});
}

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityEvent, item, stockMovement, type Item } from '$lib/server/db/schema';

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

export type MovementType = (typeof stockMovement.type.enumValues)[number];

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

/**
 * The only way item stock/cost should ever change. Appends to the
 * append-only `stock_movement` ledger and updates the item's cached
 * `current_qty` (and, for consumables bought in, `avg_cost_minor` via a
 * weighted average) in the same transaction — spec §2.4: "Current stock is
 * derived from movements, with a cached value kept consistent in a
 * transaction."
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

	await db.transaction(async (tx) => {
		const [current] = await tx.select().from(item).where(eq(item.id, itemId)).for('update');
		if (!current) throw new Error('Item not found');

		const delta = signedDelta(type, qty, conditionOnReturn, direction);
		const newQty = current.currentQty + delta;

		if (newQty < 0) {
			throw new InsufficientStockError(current.currentQty, -delta);
		}

		const updates: Partial<Item> = { currentQty: newQty, updatedAt: new Date() };

		if (current.type === 'consumable' && type === 'purchase' && unitCostMinor != null) {
			updates.avgCostMinor = weightedAverageCost(
				current.currentQty,
				current.avgCostMinor,
				qty,
				unitCostMinor
			);
		}

		await tx.update(item).set(updates).where(eq(item.id, itemId));

		await tx.insert(stockMovement).values({
			itemId,
			type,
			qty: delta,
			unitCostMinor: type === 'purchase' ? unitCostMinor : null,
			eventId,
			reason,
			conditionOnReturn,
			createdBy
		});

		const wasLow = current.currentQty <= current.minThreshold;
		const isLow = newQty <= current.minThreshold;
		if (isLow && !wasLow) {
			await tx.insert(activityEvent).values({
				type: 'inventory.low_stock',
				entityType: 'item',
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

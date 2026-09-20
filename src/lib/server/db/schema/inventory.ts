import {
	type AnyPgColumn,
	bigint,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const location = pgTable(
	'location',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		parentId: text('parent_id').references((): AnyPgColumn => location.id, {
			onDelete: 'cascade'
		}),
		name: text('name').notNull(),
		kind: text('kind', { enum: ['site', 'room', 'shelf'] })
			.notNull()
			.default('site'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('location_parent_id_idx').on(table.parentId)]
);

export const inventoryCategory = pgTable(
	'inventory_category',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		parentId: text('parent_id').references((): AnyPgColumn => inventoryCategory.id, {
			onDelete: 'cascade'
		}),
		name: text('name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('inventory_category_parent_id_idx').on(table.parentId)]
);

/**
 * Equipment condition applies to the item as a whole (not per physical
 * unit): a batch of "50 folding chairs" tracked as one row with qty=50 has
 * one condition value for the lot, rather than per-serial-number tracking,
 * which the spec doesn't call for — see docs/PLAN.md §4.
 */
export const item = pgTable(
	'item',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		description: text('description'),
		type: text('type', { enum: ['consumable', 'equipment'] }).notNull(),
		categoryId: text('category_id').references(() => inventoryCategory.id, {
			onDelete: 'set null'
		}),
		locationId: text('location_id').references(() => location.id, { onDelete: 'set null' }),
		unit: text('unit').notNull().default('pz'),
		sku: text('sku'),
		barcode: text('barcode'),
		minThreshold: integer('min_threshold').notNull().default(0),
		supplier: text('supplier'),
		notes: text('notes'),

		// Consumables: weighted average cost, updated on each purchase movement.
		avgCostMinor: bigint('avg_cost_minor', { mode: 'number' }).notNull().default(0),
		currency: text('currency').notNull().default('CHF'),

		// Cached current stock, kept consistent with stock_movement in a
		// transaction (see services/inventory.ts `recordMovement`) — never
		// written to directly outside that function.
		currentQty: integer('current_qty').notNull().default(0),

		// Equipment only.
		equipmentTracking: text('equipment_tracking', { enum: ['unit', 'quantity'] }),
		purchaseValueMinor: bigint('purchase_value_minor', { mode: 'number' }),
		usageCostMinor: bigint('usage_cost_minor', { mode: 'number' }),
		condition: text('condition', { enum: ['ok', 'needs_repair', 'broken', 'lost'] }),

		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('item_category_id_idx').on(table.categoryId),
		index('item_location_id_idx').on(table.locationId),
		index('item_barcode_idx').on(table.barcode)
	]
);

/**
 * Append-only ledger — current stock is always derived from this, never
 * written directly (spec §2.4). `qty` is signed: positive for
 * purchase/return, negative for consumption/checkout/disposal; adjustment
 * can be either sign (it reconciles counted vs. recorded stock).
 *
 * `eventId` has no FK yet — the `event` table doesn't exist until Phase 4
 * (same pattern as `activity_event.event_id`, see docs/PLAN.md §4).
 */
export const stockMovement = pgTable(
	'stock_movement',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemId: text('item_id')
			.notNull()
			.references(() => item.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: ['purchase', 'consumption', 'checkout', 'return', 'adjustment', 'disposal']
		}).notNull(),
		qty: integer('qty').notNull(),
		unitCostMinor: bigint('unit_cost_minor', { mode: 'number' }),
		eventId: text('event_id'),
		reason: text('reason'),
		conditionOnReturn: text('condition_on_return', { enum: ['returned', 'damaged', 'lost'] }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('stock_movement_item_id_idx').on(table.itemId),
		index('stock_movement_event_id_idx').on(table.eventId),
		index('stock_movement_created_at_idx').on(table.createdAt)
	]
);

export type Location = typeof location.$inferSelect;
export type InventoryCategory = typeof inventoryCategory.$inferSelect;
export type Item = typeof item.$inferSelect;
export type StockMovement = typeof stockMovement.$inferSelect;

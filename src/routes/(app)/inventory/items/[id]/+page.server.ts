import { error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inventoryCategory, item, location, stockMovement, user } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = requirePermission(locals.session, 'inventory.view');

	const [row] = await db
		.select({
			item,
			categoryName: inventoryCategory.name,
			locationName: location.name
		})
		.from(item)
		.leftJoin(inventoryCategory, eq(item.categoryId, inventoryCategory.id))
		.leftJoin(location, eq(item.locationId, location.id))
		.where(eq(item.id, params.id))
		.limit(1);

	if (!row) error(404, 'Item not found');

	const movements = await db
		.select({
			id: stockMovement.id,
			type: stockMovement.type,
			qty: stockMovement.qty,
			unitCostMinor: stockMovement.unitCostMinor,
			reason: stockMovement.reason,
			conditionOnReturn: stockMovement.conditionOnReturn,
			createdAt: stockMovement.createdAt,
			createdByName: user.name
		})
		.from(stockMovement)
		.leftJoin(user, eq(stockMovement.createdBy, user.id))
		.where(eq(stockMovement.itemId, params.id))
		.orderBy(desc(stockMovement.createdAt))
		.limit(50);

	return {
		item: row.item,
		categoryName: row.categoryName,
		locationName: row.locationName,
		movements,
		canEdit: session.permissions.has('inventory.edit'),
		canAdjustStock: session.permissions.has('inventory.adjust_stock')
	};
};

export const actions: Actions = {
	archive: async ({ params, locals }) => {
		requirePermission(locals.session, 'inventory.edit');
		await db.update(item).set({ archivedAt: new Date() }).where(eq(item.id, params.id));
	},

	unarchive: async ({ params, locals }) => {
		requirePermission(locals.session, 'inventory.edit');
		await db.update(item).set({ archivedAt: null }).where(eq(item.id, params.id));
	}
};

import { and, asc, eq, ilike, lte, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inventoryCategory, item, location } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = requirePermission(locals.session, 'inventory.view');

	const search = url.searchParams.get('q')?.trim() ?? '';
	const categoryId = url.searchParams.get('category') ?? '';
	const locationId = url.searchParams.get('location') ?? '';
	const lowStockOnly = url.searchParams.get('lowStock') === '1';

	const conditions = [];
	if (search) {
		conditions.push(
			or(
				ilike(item.name, `%${search}%`),
				ilike(item.sku, `%${search}%`),
				ilike(item.barcode, `%${search}%`)
			)
		);
	}
	if (categoryId) conditions.push(eq(item.categoryId, categoryId));
	if (locationId) conditions.push(eq(item.locationId, locationId));
	if (lowStockOnly) conditions.push(lte(item.currentQty, item.minThreshold));

	const [items, categories, locations] = await Promise.all([
		db
			.select({
				id: item.id,
				name: item.name,
				type: item.type,
				unit: item.unit,
				currentQty: item.currentQty,
				minThreshold: item.minThreshold,
				categoryName: inventoryCategory.name,
				locationName: location.name,
				archivedAt: item.archivedAt
			})
			.from(item)
			.leftJoin(inventoryCategory, eq(item.categoryId, inventoryCategory.id))
			.leftJoin(location, eq(item.locationId, location.id))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(asc(item.name)),
		db.select().from(inventoryCategory).orderBy(asc(inventoryCategory.name)),
		db.select().from(location).orderBy(asc(location.name))
	]);

	return {
		items,
		categories,
		locations,
		filters: { search, categoryId, locationId, lowStockOnly },
		canEdit: session.permissions.has('inventory.edit'),
		canAdjustStock: session.permissions.has('inventory.adjust_stock')
	};
};

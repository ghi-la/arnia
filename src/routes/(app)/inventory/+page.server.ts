import { requirePermission } from '$lib/server/auth/require-permission';
import { listItems } from '$lib/server/services/inventory';
import { listCategories, listLocations } from '$lib/server/services/inventory-taxonomy';
import { coverPhotosFor } from '$lib/server/services/item-photos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = requirePermission(locals.session, 'inventory.view');

	const search = url.searchParams.get('q')?.trim() ?? '';
	const categoryId = url.searchParams.get('category') ?? '';
	const locationId = url.searchParams.get('location') ?? '';
	const lowStockOnly = url.searchParams.get('lowStock') === '1';

	const [items, categories, locations] = await Promise.all([
		// The list shows archived items too (with a badge), as before.
		listItems({ search, categoryId, locationId, lowStockOnly, includeArchived: true }),
		listCategories(),
		listLocations()
	]);
	const covers = await coverPhotosFor(items.map((it) => it.id));

	return {
		items: items.map((it) => ({
			id: it.id,
			name: it.name,
			type: it.type,
			unit: it.unit,
			currentQty: it.currentQty,
			minThreshold: it.minThreshold,
			categoryName: it.categoryName,
			locationName: it.locationName,
			archivedAt: it.archivedAt,
			coverId: covers.get(it.id) ?? null
		})),
		categories,
		locations,
		filters: { search, categoryId, locationId, lowStockOnly },
		canEdit: session.permissions.has('inventory.edit'),
		canAdjustStock: session.permissions.has('inventory.adjust_stock')
	};
};

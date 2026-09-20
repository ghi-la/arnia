import { asc, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.view');

	const items = await db
		.select({
			id: item.id,
			name: item.name,
			sku: item.sku,
			barcode: item.barcode,
			unit: item.unit,
			currentQty: item.currentQty
		})
		.from(item)
		.where(isNull(item.archivedAt))
		.orderBy(asc(item.name));

	return { items };
};

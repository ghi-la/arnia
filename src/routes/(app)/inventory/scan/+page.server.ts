import { requirePermission } from '$lib/server/auth/require-permission';
import { listItems } from '$lib/server/services/inventory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = requirePermission(locals.session, 'inventory.view');

	const items = (await listItems()).map((it) => ({
		id: it.id,
		name: it.name,
		sku: it.sku,
		barcode: it.barcode,
		unit: it.unit,
		currentQty: it.currentQty
	}));

	return { items, canEdit: session.permissions.has('inventory.edit') };
};

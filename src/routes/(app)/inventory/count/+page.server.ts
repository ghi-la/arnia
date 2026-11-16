import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/auth/require-permission';
import { getItem, listItems, recordMovement } from '$lib/server/services/inventory';
import { COUNT_REASON } from '$lib/inventory-labels';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.adjust_stock');

	const items = (await listItems()).map((it) => ({
		id: it.id,
		name: it.name,
		sku: it.sku,
		barcode: it.barcode,
		unit: it.unit,
		currentQty: it.currentQty
	}));

	return { items };
};

const schema = z.object({
	itemId: z.string().trim().min(1),
	countedQty: z.coerce.number().int().min(0)
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = requirePermission(locals.session, 'inventory.adjust_stock');
		const formData = await request.formData();
		const parsed = schema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}

		const current = await getItem(parsed.data.itemId);

		if (!current) {
			return fail(404, { notFound: true });
		}

		const delta = parsed.data.countedQty - current.currentQty;
		if (delta === 0) {
			return { itemId: parsed.data.itemId, itemName: current.name, noChange: true };
		}

		await recordMovement({
			itemId: parsed.data.itemId,
			type: 'adjustment',
			qty: Math.abs(delta),
			direction: delta > 0 ? 'increase' : 'decrease',
			reason: COUNT_REASON,
			createdBy: session.user.id
		});

		return {
			itemId: parsed.data.itemId,
			itemName: current.name,
			noChange: false,
			previousQty: current.currentQty,
			newQty: parsed.data.countedQty
		};
	}
};

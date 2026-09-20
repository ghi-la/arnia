import { fail } from '@sveltejs/kit';
import { asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { recordMovement } from '$lib/server/services/inventory';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.adjust_stock');

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

		const [current] = await db
			.select({ currentQty: item.currentQty, name: item.name })
			.from(item)
			.where(eq(item.id, parsed.data.itemId));

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
			reason: 'Inventory count',
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

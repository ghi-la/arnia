import { fail, redirect } from '@sveltejs/kit';
import { asc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { InsufficientStockError, recordMovement } from '$lib/server/services/inventory';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals.session, 'inventory.adjust_stock');

	const items = await db
		.select({
			id: item.id,
			name: item.name,
			sku: item.sku,
			unit: item.unit,
			currentQty: item.currentQty
		})
		.from(item)
		.where(isNull(item.archivedAt))
		.orderBy(asc(item.name));

	return { items, preselectedItemId: url.searchParams.get('itemId') ?? '' };
};

const schema = z.object({
	itemId: z.string().trim().min(1),
	type: z.enum(['purchase', 'consumption', 'checkout', 'return', 'adjustment', 'disposal']),
	qty: z.coerce.number().int().positive(),
	unitCost: z
		.string()
		.trim()
		.optional()
		.transform((v) => (v ? Math.round(Number(v) * 100) : undefined)),
	reason: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((v) => v || undefined),
	conditionOnReturn: z.enum(['returned', 'damaged', 'lost']).optional(),
	direction: z.enum(['increase', 'decrease']).optional()
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = requirePermission(locals.session, 'inventory.adjust_stock');

		const formData = await request.formData();
		const parsed = schema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				values: Object.fromEntries(formData) as Record<string, string>,
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		if (
			(parsed.data.type === 'adjustment' || parsed.data.type === 'disposal') &&
			!parsed.data.reason
		) {
			return fail(400, {
				values: Object.fromEntries(formData) as Record<string, string>,
				reasonRequired: true
			});
		}

		try {
			await recordMovement({
				itemId: parsed.data.itemId,
				type: parsed.data.type,
				qty: parsed.data.qty,
				unitCostMinor: parsed.data.unitCost,
				reason: parsed.data.reason,
				conditionOnReturn: parsed.data.conditionOnReturn,
				direction: parsed.data.direction,
				createdBy: session.user.id
			});
		} catch (err) {
			if (err instanceof InsufficientStockError) {
				return fail(400, {
					values: Object.fromEntries(formData) as Record<string, string>,
					insufficientStockAvailable: err.available
				});
			}
			throw err;
		}

		redirect(303, resolve('/(app)/inventory/items/[id]', { id: parsed.data.itemId }));
	}
};

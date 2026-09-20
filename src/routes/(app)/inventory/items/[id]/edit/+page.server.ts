import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { inventoryCategory, item, location } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { itemSchema } from '$lib/server/services/item-schema';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.session, 'inventory.edit');

	const [existing, categories, locations] = await Promise.all([
		db.select().from(item).where(eq(item.id, params.id)).limit(1),
		db.select().from(inventoryCategory).orderBy(asc(inventoryCategory.name)),
		db.select().from(location).orderBy(asc(location.name))
	]);

	if (!existing[0]) error(404, 'Item not found');

	return { item: existing[0], categories, locations };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		requirePermission(locals.session, 'inventory.edit');

		const formData = await request.formData();
		const parsed = itemSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				values: Object.fromEntries(formData) as Record<string, string>,
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const { purchaseValue: _pv, usageCost: _uc, ...values } = parsed.data;
		await db
			.update(item)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(item.id, params.id));

		redirect(303, resolve('/(app)/inventory/items/[id]', { id: params.id }));
	}
};

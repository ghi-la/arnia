import { fail, redirect } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { inventoryCategory, item, location } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { itemSchema } from '$lib/server/services/item-schema';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.edit');

	const [categories, locations] = await Promise.all([
		db.select().from(inventoryCategory).orderBy(asc(inventoryCategory.name)),
		db.select().from(location).orderBy(asc(location.name))
	]);

	return { categories, locations };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
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
		const [created] = await db.insert(item).values(values).returning({ id: item.id });

		redirect(303, resolve('/(app)/inventory/items/[id]', { id: created.id }));
	}
};

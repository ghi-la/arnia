import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { inventoryCategory } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { getCategoryTree } from '$lib/server/services/inventory-taxonomy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.edit');

	const [tree, flat] = await Promise.all([
		getCategoryTree(),
		db.select().from(inventoryCategory).orderBy(asc(inventoryCategory.name))
	]);

	return { tree, flat };
};

const createSchema = z.object({
	name: z.string().trim().min(1).max(200),
	parentId: z
		.string()
		.trim()
		.transform((v) => (v === '' ? null : v))
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requirePermission(locals.session, 'inventory.edit');
		const formData = await request.formData();
		const parsed = createSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}

		await db.insert(inventoryCategory).values(parsed.data);
	},

	delete: async ({ request, locals }) => {
		requirePermission(locals.session, 'inventory.edit');
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await db.delete(inventoryCategory).where(eq(inventoryCategory.id, id));
	}
};

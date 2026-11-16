import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/auth/require-permission';
import {
	createLocation,
	deleteLocation,
	getLocationTree
} from '$lib/server/services/inventory-taxonomy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'inventory.edit');
	const tree = await getLocationTree();
	return { tree, flat: tree.map((t) => t.node) };
};

const createSchema = z.object({
	name: z.string().trim().min(1).max(200),
	kind: z.enum(['site', 'room', 'shelf']),
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

		await createLocation(parsed.data);
		return { created: parsed.data.name };
	},

	delete: async ({ request, locals }) => {
		requirePermission(locals.session, 'inventory.edit');
		const formData = await request.formData();
		await deleteLocation(String(formData.get('id')));
		return { deleted: true };
	}
};

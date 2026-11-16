import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/auth/require-permission';
import { itemSchema } from '$lib/server/services/item-schema';
import { getItem, updateItem } from '$lib/server/services/inventory';
import { listCategories, listLocations } from '$lib/server/services/inventory-taxonomy';
import { listItemPhotos, MAX_PHOTOS_PER_ITEM, maxUploadMb } from '$lib/server/services/item-photos';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.session, 'inventory.edit');

	const [existing, categories, locations, photos] = await Promise.all([
		getItem(params.id),
		listCategories(),
		listLocations(),
		listItemPhotos(params.id)
	]);

	if (!existing) error(404, 'Item not found');

	return {
		item: existing,
		categories,
		locations,
		photos,
		maxUploadMb: maxUploadMb(),
		maxPhotos: MAX_PHOTOS_PER_ITEM
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');

		const formData = await request.formData();
		const parsed = itemSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				values: Object.fromEntries(formData) as Record<string, string>,
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const updated = await updateItem(params.id, parsed.data, session.user.id);
		if (!updated) error(404, 'Item not found');

		redirect(303, resolve('/(app)/inventory/items/[id]', { id: params.id }));
	}
};

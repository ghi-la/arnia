import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/auth/require-permission';
import { itemSchema } from '$lib/server/services/item-schema';
import { createItem } from '$lib/server/services/inventory';
import { listCategories, listLocations } from '$lib/server/services/inventory-taxonomy';
import { MAX_PHOTOS_PER_ITEM, maxUploadMb } from '$lib/server/services/item-photos';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals.session, 'inventory.edit');

	const [categories, locations] = await Promise.all([listCategories(), listLocations()]);

	// `?barcode=` comes from the scanner's "create item with this code".
	const barcode = url.searchParams.get('barcode')?.trim().slice(0, 100);
	return {
		categories,
		locations,
		prefill: barcode ? { barcode } : undefined,
		maxUploadMb: maxUploadMb(),
		maxPhotos: MAX_PHOTOS_PER_ITEM
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');

		const formData = await request.formData();
		const parsed = itemSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				values: Object.fromEntries(formData) as Record<string, string>,
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const id = await createItem(parsed.data, session.user.id);

		redirect(303, resolve('/(app)/inventory/items/[id]', { id }));
	}
};

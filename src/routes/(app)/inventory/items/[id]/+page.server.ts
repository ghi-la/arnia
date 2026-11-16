import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/auth/require-permission';
import { getItemDetail, setItemArchived } from '$lib/server/services/inventory';
import {
	addItemPhoto,
	deleteItemPhoto,
	ItemPhotoError,
	listItemPhotos,
	MAX_PHOTOS_PER_ITEM,
	maxUploadMb
} from '$lib/server/services/item-photos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = requirePermission(locals.session, 'inventory.view');

	const [detail, photos] = await Promise.all([getItemDetail(params.id), listItemPhotos(params.id)]);
	if (!detail) error(404, 'Item not found');

	return {
		item: detail.item,
		categoryName: detail.categoryName,
		locationName: detail.locationName,
		movements: detail.movements,
		photos,
		maxUploadMb: maxUploadMb(),
		maxPhotos: MAX_PHOTOS_PER_ITEM,
		canEdit: session.permissions.has('inventory.edit'),
		canAdjustStock: session.permissions.has('inventory.adjust_stock')
	};
};

export const actions: Actions = {
	archive: async ({ params, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');
		const ok = await setItemArchived({
			itemId: params.id,
			archived: true,
			userId: session.user.id
		});
		if (!ok) return fail(404, { error: 'not_found' as const });
		return { archived: true };
	},

	unarchive: async ({ params, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');
		const ok = await setItemArchived({
			itemId: params.id,
			archived: false,
			userId: session.user.id
		});
		if (!ok) return fail(404, { error: 'not_found' as const });
		return { archived: false };
	},

	uploadPhoto: async ({ params, request, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');
		const file = (await request.formData()).get('file');
		if (!(file instanceof File)) return fail(400, { error: 'empty' as const });

		try {
			const photo = await addItemPhoto({ itemId: params.id, file, userId: session.user.id });
			return { photoId: photo.id };
		} catch (err) {
			if (err instanceof ItemPhotoError) {
				return fail(err.code === 'not_configured' ? 503 : 400, { error: err.code });
			}
			throw err;
		}
	},

	deletePhoto: async ({ params, request, locals }) => {
		const session = requirePermission(locals.session, 'inventory.edit');
		const attachmentId = (await request.formData()).get('id');
		if (typeof attachmentId !== 'string') return fail(400, { error: 'not_found' as const });

		try {
			await deleteItemPhoto({ itemId: params.id, attachmentId, userId: session.user.id });
			return { deleted: attachmentId };
		} catch (err) {
			if (err instanceof ItemPhotoError) return fail(404, { error: err.code });
			throw err;
		}
	}
};

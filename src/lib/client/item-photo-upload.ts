import { deserialize } from '$app/forms';
import { resolve } from '$app/paths';
import { m } from '$lib/paraglide/messages';
import { compressImage } from './image-compress';

/**
 * Uploads one photo to an item (the `uploadPhoto` action on the item's
 * page). Shared by the create form (photos queued until the item exists),
 * the edit page and the gallery. The photo is resized/re-encoded in the
 * browser first, so it's typically well under 1 MB — comfortably below
 * Vercel's 4.5 MB request limit, one request per photo.
 *
 * Never throws: returns a user-facing (localized) error message instead.
 */
export async function uploadItemPhoto(
	itemId: string,
	file: File,
	options: { maxUploadMb: number; maxPhotos: number; onCompressed?: () => void }
): Promise<{ ok: true } | { ok: false; message: string }> {
	let toSend = file;
	try {
		toSend = await compressImage(file);
	} catch {
		// Undecodable here (e.g. HEIC outside Safari): send the original — the
		// server validates it by its real bytes anyway.
	}
	options.onCompressed?.();

	if (toSend.size > options.maxUploadMb * 1024 * 1024) {
		return { ok: false, message: photoErrorMessage('too_large', options) };
	}

	const body = new FormData();
	body.set('file', toSend);

	try {
		const res = await fetch(
			resolve('/(app)/inventory/items/[id]', { id: itemId }) + '?/uploadPhoto',
			{ method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } }
		);
		const result = deserialize(await res.text());
		if (result.type === 'success') return { ok: true };
		if (result.type === 'failure') {
			return { ok: false, message: photoErrorMessage(result.data?.error, options) };
		}
		return {
			ok: false,
			message:
				result.type === 'error' && result.status === 403
					? m.common_error_forbidden()
					: m.common_error_generic()
		};
	} catch {
		return { ok: false, message: m.common_error_network() };
	}
}

export function photoErrorMessage(
	code: unknown,
	options: { maxUploadMb: number; maxPhotos: number }
): string {
	switch (code) {
		case 'too_large':
			return m.item_photo_too_large({ mb: options.maxUploadMb });
		case 'unsupported':
			return m.item_photo_unsupported();
		case 'limit':
			return m.item_photo_limit({ max: options.maxPhotos });
		case 'not_configured':
			return m.item_photo_storage_unavailable();
		default:
			return m.common_error_generic();
	}
}

/** Cheap pre-check before compressing; the server re-checks the real bytes. */
export function looksLikeImage(file: File): boolean {
	return file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
}

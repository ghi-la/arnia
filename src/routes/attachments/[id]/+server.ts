import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import {
	attachmentAbsolutePath,
	attachmentThumbnailAbsolutePath,
	getAttachment
} from '$lib/server/storage';
import { canAccessAttachment } from '$lib/server/storage/access-control';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const attachment = await getAttachment(params.id);
	if (!attachment) error(404, 'Not found');

	if (!canAccessAttachment(locals.session, attachment)) {
		error(403, 'Forbidden');
	}

	const wantsThumbnail = url.searchParams.get('size') === 'thumb';
	const thumbPath = wantsThumbnail ? attachmentThumbnailAbsolutePath(attachment) : null;
	const filePath = thumbPath ?? attachmentAbsolutePath(attachment);
	const mime = thumbPath ? 'image/jpeg' : attachment.mime;

	try {
		const data = await readFile(filePath);
		return new Response(new Uint8Array(data), {
			headers: {
				'Content-Type': mime,
				'Cache-Control': 'private, max-age=31536000, immutable',
				'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`
			}
		});
	} catch {
		error(404, 'Not found');
	}
};

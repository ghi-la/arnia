import { error } from '@sveltejs/kit';
import { getAttachment, openAttachment } from '$lib/server/storage';
import { canAccessAttachment } from '$lib/server/storage/access-control';
import type { RequestHandler } from './$types';

/**
 * The only way attachment bytes reach a browser: checks the caller can see
 * the owning entity, then streams the object from (private) R2. Proxying
 * keeps everything same-origin — no public bucket, no presigned URLs, no
 * CSP changes, no R2 CORS setup.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const attachment = await getAttachment(params.id);
	if (!attachment) error(404, 'Not found');

	if (!canAccessAttachment(locals.session, attachment)) {
		error(403, 'Forbidden');
	}

	const variant = url.searchParams.get('size') === 'thumb' ? 'thumb' : 'original';
	const object = await openAttachment(attachment, variant);
	if (!object) error(404, 'Not found');

	const headers: Record<string, string> = {
		'Content-Type': object.mime,
		// Attachments are immutable (a new upload gets a new id), so the
		// browser may cache them for good — but only privately, per user.
		'Cache-Control': 'private, max-age=31536000, immutable',
		'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
		'X-Content-Type-Options': 'nosniff'
	};
	if (object.size !== undefined) headers['Content-Length'] = String(object.size);
	if (object.etag) headers['ETag'] = object.etag;

	return new Response(object.stream, { headers });
};

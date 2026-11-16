import sharp from 'sharp';
import type { ClientSession } from 'mongodb';
import { collections, withTransaction } from '../db';
import { toEntity, type Attachment, type AttachmentDoc } from '../db/types';
import { detectFileType } from './file-type';
import { deleteObjects, getObjectStream, putObject, type ObjectStream } from './r2';

export { StorageNotConfiguredError } from './r2';

const THUMBNAIL_SIZE = 400;
const THUMBNAILABLE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class UnsupportedFileTypeError extends Error {
	constructor() {
		super('Unsupported or unrecognized file type');
		this.name = 'UnsupportedFileTypeError';
	}
}

export interface SaveAttachmentInput {
	buffer: Uint8Array;
	originalName: string;
	entityType: string;
	entityId: string;
	uploadedBy: string;
	/** Accepted MIME types (detected from the bytes). Anything else is rejected. */
	accept: readonly string[];
	/**
	 * Runs in the same transaction as the `attachment` insert — use it to
	 * append the owning module's `activity_event` so the two can't diverge.
	 */
	afterInsert?: (session: ClientSession, row: Attachment) => Promise<void>;
}

/**
 * Validates the upload by its actual magic bytes (never the client-supplied
 * MIME type — spec §5), uploads it to R2 under
 * `{year}/{entityType}/{id}.{ext}` plus a JPEG thumbnail for images, and
 * records it in the `attachment` table. If the DB write fails, the objects
 * already uploaded are removed again (best-effort) so R2 doesn't collect
 * orphans.
 */
export async function saveAttachment(input: SaveAttachmentInput): Promise<Attachment> {
	const detected = detectFileType(input.buffer);
	if (!detected || !input.accept.includes(detected.mime)) {
		throw new UnsupportedFileTypeError();
	}

	const id = crypto.randomUUID();
	const prefix = `${new Date().getFullYear()}/${input.entityType}`;
	const key = `${prefix}/${id}.${detected.ext}`;

	let thumbnail: Buffer | null = null;
	if (THUMBNAILABLE_MIME.has(detected.mime)) {
		try {
			thumbnail = await sharp(input.buffer)
				.rotate() // honour EXIF orientation so phone photos aren't sideways
				.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
				.jpeg({ quality: 80 })
				.toBuffer();
		} catch {
			// Thumbnail generation is best-effort — the original file is what matters.
		}
	}
	const thumbKey = thumbnail ? `${prefix}/${id}_thumb.jpg` : null;

	await putObject(key, input.buffer, detected.mime);
	if (thumbnail && thumbKey) await putObject(thumbKey, thumbnail, 'image/jpeg');

	const doc: AttachmentDoc = {
		_id: id,
		entityType: input.entityType,
		entityId: input.entityId,
		path: key,
		thumbnailPath: thumbKey,
		mime: detected.mime,
		size: input.buffer.byteLength,
		originalName: input.originalName,
		uploadedBy: input.uploadedBy,
		createdAt: new Date()
	};

	try {
		await withTransaction(async (session) => {
			await collections.attachment().insertOne(doc, { session });
			await input.afterInsert?.(session, toEntity(doc));
		});
		return toEntity(doc);
	} catch (err) {
		await deleteObjects([key, ...(thumbKey ? [thumbKey] : [])]).catch(() => {});
		throw err;
	}
}

/**
 * Opens an attachment's bytes from R2 for streaming. Falls back to the
 * original when a thumbnail is requested but none exists (e.g. PDFs).
 */
export async function openAttachment(
	a: Attachment,
	variant: 'original' | 'thumb'
): Promise<(ObjectStream & { mime: string }) | null> {
	const useThumb = variant === 'thumb' && !!a.thumbnailPath;
	const object = await getObjectStream(useThumb ? a.thumbnailPath! : a.path);
	return object ? { ...object, mime: useThumb ? 'image/jpeg' : a.mime } : null;
}

export async function getAttachment(id: string): Promise<Attachment | null> {
	const doc = await collections.attachment().findOne({ _id: id });
	return doc ? toEntity(doc) : null;
}

export async function listAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
	const docs = await collections
		.attachment()
		.find({ entityType, entityId })
		.sort({ createdAt: 1 })
		.toArray();
	return docs.map(toEntity);
}

/**
 * Deletes the row (plus `afterDelete`, in the same transaction), then the
 * R2 objects. Object deletion is best-effort: a leftover object is
 * harmless, a dangling row pointing at nothing is not.
 */
export async function deleteAttachment(
	id: string,
	afterDelete?: (session: ClientSession, row: Attachment) => Promise<void>
): Promise<void> {
	const row = await getAttachment(id);
	if (!row) return;

	await withTransaction(async (session) => {
		await collections.attachment().deleteOne({ _id: id }, { session });
		await afterDelete?.(session, row);
	});

	await deleteObjects([row.path, ...(row.thumbnailPath ? [row.thumbnailPath] : [])]).catch(
		() => {}
	);
}

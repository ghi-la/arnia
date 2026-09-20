import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { attachment, type Attachment } from '../db/schema';
import { detectFileType } from './file-type';

const THUMBNAIL_SIZE = 400;
const THUMBNAILABLE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function uploadsDir(): string {
	return resolve(process.env.UPLOADS_DIR || './uploads');
}

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
}

/**
 * Validates the upload by its actual magic bytes (never the client-supplied
 * MIME type — spec §5), writes it to the uploads volume under
 * `{year}/{entityType}/{id}.{ext}`, generates a thumbnail for images, and
 * records it in the `attachment` table.
 */
export async function saveAttachment(input: SaveAttachmentInput): Promise<Attachment> {
	const detected = detectFileType(input.buffer);
	if (!detected) {
		throw new UnsupportedFileTypeError();
	}

	const id = crypto.randomUUID();
	const year = String(new Date().getFullYear());
	const relDir = join(year, input.entityType);
	const relPath = join(relDir, `${id}.${detected.ext}`);
	const absDir = join(uploadsDir(), relDir);
	const absPath = join(uploadsDir(), relPath);

	await mkdir(absDir, { recursive: true });
	await writeFile(absPath, input.buffer);

	let relThumbPath: string | null = null;
	if (THUMBNAILABLE_MIME.has(detected.mime)) {
		try {
			const thumbRelPath = join(relDir, `${id}_thumb.jpg`);
			await sharp(input.buffer)
				.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
				.jpeg({ quality: 80 })
				.toFile(join(uploadsDir(), thumbRelPath));
			relThumbPath = thumbRelPath;
		} catch {
			// Thumbnail generation is best-effort — the original file is what matters.
		}
	}

	const [row] = await db
		.insert(attachment)
		.values({
			id,
			entityType: input.entityType,
			entityId: input.entityId,
			path: relPath,
			thumbnailPath: relThumbPath,
			mime: detected.mime,
			size: input.buffer.byteLength,
			originalName: input.originalName,
			uploadedBy: input.uploadedBy
		})
		.returning();

	return row;
}

export function attachmentAbsolutePath(a: Attachment): string {
	return join(uploadsDir(), a.path);
}

export function attachmentThumbnailAbsolutePath(a: Attachment): string | null {
	return a.thumbnailPath ? join(uploadsDir(), a.thumbnailPath) : null;
}

export async function getAttachment(id: string): Promise<Attachment | null> {
	const [row] = await db.select().from(attachment).where(eq(attachment.id, id)).limit(1);
	return row ?? null;
}

export async function listAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
	return db
		.select()
		.from(attachment)
		.where(and(eq(attachment.entityType, entityType), eq(attachment.entityId, entityId)));
}

export async function deleteAttachment(id: string): Promise<void> {
	const row = await getAttachment(id);
	if (!row) return;

	await db.delete(attachment).where(eq(attachment.id, id));

	await unlink(attachmentAbsolutePath(row)).catch(() => {});
	const thumbPath = attachmentThumbnailAbsolutePath(row);
	if (thumbPath) await unlink(thumbPath).catch(() => {});
}

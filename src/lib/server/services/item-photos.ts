import type { ClientSession } from 'mongodb';
import { collections } from '$lib/server/db';
import {
	deleteAttachment,
	listAttachments,
	saveAttachment,
	StorageNotConfiguredError,
	UnsupportedFileTypeError
} from '$lib/server/storage';

/**
 * Item photos are plain `attachment` documents with `entityType: 'item'`;
 * the oldest one is the item's cover. Images only. Access to the bytes is
 * enforced by `/attachments/[id]` via `canAccessAttachment`.
 */
const ENTITY_TYPE = 'item';
export const MAX_PHOTOS_PER_ITEM = 20;
const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

/**
 * Per-photo upload limit. Vercel rejects function request bodies over
 * 4.5 MB, so this is capped at 4 — photos are compressed in the browser to
 * well under 1 MB anyway, so the cap only bites on unusual originals.
 */
export function maxUploadMb(): number {
	const mb = Number(process.env.MAX_UPLOAD_MB);
	return Number.isFinite(mb) && mb > 0 ? Math.min(mb, 4) : 4;
}

async function logActivity(
	session: ClientSession,
	type: string,
	itemId: string,
	userId: string,
	payload: Record<string, unknown>
) {
	await collections.activityEvent().insertOne(
		{
			_id: crypto.randomUUID(),
			type,
			entityType: ENTITY_TYPE,
			entityId: itemId,
			actorUserId: userId,
			eventId: null,
			payload,
			createdAt: new Date()
		},
		{ session }
	);
}

export type ItemPhotoErrorCode =
	'empty' | 'too_large' | 'unsupported' | 'limit' | 'not_found' | 'not_configured';

export class ItemPhotoError extends Error {
	readonly code: ItemPhotoErrorCode;
	constructor(code: ItemPhotoErrorCode) {
		super(`Item photo error: ${code}`);
		this.name = 'ItemPhotoError';
		this.code = code;
	}
}

/** What the client gets — no storage keys. */
export interface ItemPhoto {
	id: string;
	originalName: string;
	hasThumbnail: boolean;
	createdAt: Date;
}

export async function listItemPhotos(itemId: string): Promise<ItemPhoto[]> {
	const rows = await listAttachments(ENTITY_TYPE, itemId);
	return rows.map((a) => ({
		id: a.id,
		originalName: a.originalName,
		hasThumbnail: !!a.thumbnailPath,
		createdAt: a.createdAt
	}));
}

export async function addItemPhoto(input: {
	itemId: string;
	file: File;
	userId: string;
}): Promise<ItemPhoto> {
	const { itemId, file, userId } = input;

	if (file.size === 0) throw new ItemPhotoError('empty');
	if (file.size > maxUploadMb() * 1024 * 1024) throw new ItemPhotoError('too_large');

	const existing = await collections.item().findOne({ _id: itemId }, { projection: { name: 1 } });
	if (!existing) throw new ItemPhotoError('not_found');

	const n = await collections
		.attachment()
		.countDocuments({ entityType: ENTITY_TYPE, entityId: itemId });
	if (n >= MAX_PHOTOS_PER_ITEM) throw new ItemPhotoError('limit');

	try {
		const row = await saveAttachment({
			buffer: new Uint8Array(await file.arrayBuffer()),
			originalName: file.name || 'photo',
			entityType: ENTITY_TYPE,
			entityId: itemId,
			uploadedBy: userId,
			accept: ACCEPTED_IMAGES,
			afterInsert: async (session, saved) => {
				await logActivity(session, 'inventory.photo_added', itemId, userId, {
					itemName: existing.name,
					attachmentId: saved.id
				});
			}
		});
		return {
			id: row.id,
			originalName: row.originalName,
			hasThumbnail: !!row.thumbnailPath,
			createdAt: row.createdAt
		};
	} catch (err) {
		if (err instanceof UnsupportedFileTypeError) throw new ItemPhotoError('unsupported');
		if (err instanceof StorageNotConfiguredError) throw new ItemPhotoError('not_configured');
		throw err;
	}
}

export async function deleteItemPhoto(input: {
	itemId: string;
	attachmentId: string;
	userId: string;
}): Promise<void> {
	const { itemId, attachmentId, userId } = input;

	// Scope the lookup to this item so a crafted id can't delete another
	// entity's attachment through the item page's action.
	const row = await collections
		.attachment()
		.findOne(
			{ _id: attachmentId, entityType: ENTITY_TYPE, entityId: itemId },
			{ projection: { _id: 1 } }
		);
	if (!row) throw new ItemPhotoError('not_found');

	await deleteAttachment(attachmentId, async (session, deleted) => {
		await logActivity(session, 'inventory.photo_removed', itemId, userId, {
			attachmentId: deleted.id,
			originalName: deleted.originalName
		});
	});
}

/** The cover (oldest image) per item, as `itemId → attachmentId`. */
export async function coverPhotosFor(itemIds: string[]): Promise<Map<string, string>> {
	if (itemIds.length === 0) return new Map();
	const rows = await collections
		.attachment()
		.aggregate<{ _id: string; attachmentId: string }>([
			{ $match: { entityType: ENTITY_TYPE, entityId: { $in: itemIds } } },
			{ $sort: { createdAt: 1 } },
			{ $group: { _id: '$entityId', attachmentId: { $first: '$_id' } } }
		])
		.toArray();
	return new Map(rows.map((r) => [r._id, r.attachmentId]));
}

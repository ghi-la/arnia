import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
	itemFindOne: vi.fn(),
	attachmentCount: vi.fn(),
	attachmentFindOne: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	collections: {
		item: () => ({ findOne: db.itemFindOne }),
		attachment: () => ({ countDocuments: db.attachmentCount, findOne: db.attachmentFindOne }),
		activityEvent: () => ({ insertOne: vi.fn() })
	}
}));

vi.mock('$lib/server/storage', () => {
	class UnsupportedFileTypeError extends Error {}
	class StorageNotConfiguredError extends Error {}
	return {
		saveAttachment: vi.fn(),
		deleteAttachment: vi.fn(),
		listAttachments: vi.fn(),
		UnsupportedFileTypeError,
		StorageNotConfiguredError
	};
});

const storage = await import('$lib/server/storage');
const { addItemPhoto, deleteItemPhoto, ItemPhotoError, MAX_PHOTOS_PER_ITEM, maxUploadMb } =
	await import('./item-photos');

function file(bytes: number, name = 'photo.jpg'): File {
	return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (err) {
		return err instanceof ItemPhotoError ? err.code : `unexpected: ${String(err)}`;
	}
	return undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	delete process.env.MAX_UPLOAD_MB;
	db.itemFindOne.mockResolvedValue({ _id: 'i1', name: 'Tent' });
	db.attachmentCount.mockResolvedValue(0);
});

describe('maxUploadMb', () => {
	it('never exceeds 4 MB (Vercel rejects bodies over 4.5 MB)', () => {
		expect(maxUploadMb()).toBe(4);
		process.env.MAX_UPLOAD_MB = '25';
		expect(maxUploadMb()).toBe(4);
		process.env.MAX_UPLOAD_MB = '2';
		expect(maxUploadMb()).toBe(2);
	});
});

describe('addItemPhoto', () => {
	it('rejects empty and oversized files before touching the database or R2', async () => {
		process.env.MAX_UPLOAD_MB = '1';
		expect(await codeOf(addItemPhoto({ itemId: 'i1', file: file(0), userId: 'u1' }))).toBe('empty');
		expect(
			await codeOf(addItemPhoto({ itemId: 'i1', file: file(1024 * 1024 + 1), userId: 'u1' }))
		).toBe('too_large');
		expect(db.itemFindOne).not.toHaveBeenCalled();
		expect(storage.saveAttachment).not.toHaveBeenCalled();
	});

	it('rejects uploads for an unknown item', async () => {
		db.itemFindOne.mockResolvedValueOnce(null);
		expect(await codeOf(addItemPhoto({ itemId: 'nope', file: file(10), userId: 'u1' }))).toBe(
			'not_found'
		);
	});

	it('enforces the per-item limit', async () => {
		db.attachmentCount.mockResolvedValueOnce(MAX_PHOTOS_PER_ITEM);
		expect(await codeOf(addItemPhoto({ itemId: 'i1', file: file(10), userId: 'u1' }))).toBe(
			'limit'
		);
		expect(storage.saveAttachment).not.toHaveBeenCalled();
	});

	it('only accepts images', async () => {
		vi.mocked(storage.saveAttachment).mockResolvedValueOnce({
			id: 'a1',
			entityType: 'item',
			entityId: 'i1',
			path: '2026/item/a1.jpg',
			thumbnailPath: null,
			mime: 'image/jpeg',
			size: 10,
			originalName: 'photo.jpg',
			uploadedBy: 'u1',
			createdAt: new Date()
		});
		await addItemPhoto({ itemId: 'i1', file: file(10), userId: 'u1' });
		const accept = vi.mocked(storage.saveAttachment).mock.calls[0][0].accept;
		expect(accept).toContain('image/jpeg');
		expect(accept).not.toContain('application/pdf');
	});

	it('maps storage errors to user-facing codes', async () => {
		vi.mocked(storage.saveAttachment).mockRejectedValueOnce(new storage.UnsupportedFileTypeError());
		expect(await codeOf(addItemPhoto({ itemId: 'i1', file: file(10), userId: 'u1' }))).toBe(
			'unsupported'
		);

		vi.mocked(storage.saveAttachment).mockRejectedValueOnce(
			new storage.StorageNotConfiguredError([])
		);
		expect(await codeOf(addItemPhoto({ itemId: 'i1', file: file(10), userId: 'u1' }))).toBe(
			'not_configured'
		);
	});

	it('saves the photo under the item and returns no storage keys', async () => {
		vi.mocked(storage.saveAttachment).mockResolvedValueOnce({
			id: 'a1',
			entityType: 'item',
			entityId: 'i1',
			path: '2026/item/a1.jpg',
			thumbnailPath: '2026/item/a1_thumb.jpg',
			mime: 'image/jpeg',
			size: 10,
			originalName: 'photo.jpg',
			uploadedBy: 'u1',
			createdAt: new Date()
		});

		const photo = await addItemPhoto({ itemId: 'i1', file: file(10), userId: 'u1' });

		expect(storage.saveAttachment).toHaveBeenCalledWith(
			expect.objectContaining({ entityType: 'item', entityId: 'i1', uploadedBy: 'u1' })
		);
		expect(photo).toMatchObject({ id: 'a1', hasThumbnail: true });
		expect(photo).not.toHaveProperty('path');
	});
});

describe('deleteItemPhoto', () => {
	it("refuses to delete an attachment that doesn't belong to the item", async () => {
		db.attachmentFindOne.mockResolvedValueOnce(null);
		expect(
			await codeOf(deleteItemPhoto({ itemId: 'i1', attachmentId: 'other', userId: 'u1' }))
		).toBe('not_found');
		expect(db.attachmentFindOne).toHaveBeenCalledWith(
			{ _id: 'other', entityType: 'item', entityId: 'i1' },
			expect.anything()
		);
		expect(storage.deleteAttachment).not.toHaveBeenCalled();
	});
});

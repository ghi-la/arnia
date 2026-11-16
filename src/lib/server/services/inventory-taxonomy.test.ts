import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
	categoryFindOne: vi.fn(),
	categoryInsertOne: vi.fn(),
	locationFindOne: vi.fn(),
	locationInsertOne: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	collections: {
		category: () => ({ findOne: db.categoryFindOne, insertOne: db.categoryInsertOne }),
		location: () => ({ findOne: db.locationFindOne, insertOne: db.locationInsertOne })
	},
	withTransaction: vi.fn()
}));

const { findOrCreateCategory, findOrCreateLocation } = await import('./inventory-taxonomy');

beforeEach(() => {
	vi.clearAllMocks();
});

describe('findOrCreateCategory', () => {
	it('creates a top-level category with the trimmed name', async () => {
		db.categoryFindOne.mockResolvedValue(null);
		const result = await findOrCreateCategory('  Tende  ');

		expect(result).toMatchObject({ name: 'Tende', created: true });
		expect(db.categoryInsertOne).toHaveBeenCalledWith(
			expect.objectContaining({ _id: result.id, parentId: null, name: 'Tende' })
		);
	});

	it('looks the name up case-insensitively', async () => {
		db.categoryFindOne.mockResolvedValue(null);
		await findOrCreateCategory('tende');
		expect(db.categoryFindOne).toHaveBeenCalledWith(
			{ name: 'tende' },
			{ collation: { locale: 'en', strength: 2 } }
		);
	});

	it('returns the existing category instead of creating a duplicate', async () => {
		db.categoryFindOne.mockResolvedValue({ _id: 'c1', name: 'Tende' });
		const result = await findOrCreateCategory('tende');

		expect(result).toEqual({ id: 'c1', name: 'Tende', created: false });
		expect(db.categoryInsertOne).not.toHaveBeenCalled();
	});
});

describe('findOrCreateLocation', () => {
	it('creates a top-level room', async () => {
		db.locationFindOne.mockResolvedValue(null);
		const result = await findOrCreateLocation('Magazzino');

		expect(result).toMatchObject({ name: 'Magazzino', created: true });
		expect(db.locationInsertOne).toHaveBeenCalledWith(
			expect.objectContaining({ parentId: null, kind: 'room', name: 'Magazzino' })
		);
	});

	it('returns the existing location instead of creating a duplicate', async () => {
		db.locationFindOne.mockResolvedValue({ _id: 'l1', name: 'Magazzino' });
		const result = await findOrCreateLocation('magazzino');

		expect(result).toEqual({ id: 'l1', name: 'Magazzino', created: false });
		expect(db.locationInsertOne).not.toHaveBeenCalled();
	});
});

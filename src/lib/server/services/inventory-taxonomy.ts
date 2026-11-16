import { collections, withTransaction } from '$lib/server/db';
import {
	toEntity,
	type CategoryDoc,
	type InventoryCategory,
	type Location,
	type LocationDoc
} from '$lib/server/db/types';

export interface TreeNode<T> {
	node: T;
	depth: number;
}

/** Flattens a parent/child list into a depth-first, indentation-ready list. */
function toTree<T extends { id: string; parentId: string | null; name: string }>(
	rows: T[]
): TreeNode<T>[] {
	const byParent = new Map<string | null, T[]>();
	for (const row of rows) {
		const list = byParent.get(row.parentId) ?? [];
		list.push(row);
		byParent.set(row.parentId, list);
	}

	const out: TreeNode<T>[] = [];
	function visit(parentId: string | null, depth: number) {
		for (const node of byParent.get(parentId) ?? []) {
			out.push({ node, depth });
			visit(node.id, depth + 1);
		}
	}
	visit(null, 0);
	return out;
}

export async function listLocations(): Promise<Location[]> {
	const rows = await collections.location().find().sort({ name: 1 }).toArray();
	return rows.map(toEntity);
}

export async function listCategories(): Promise<InventoryCategory[]> {
	const rows = await collections.category().find().sort({ name: 1 }).toArray();
	return rows.map(toEntity);
}

export async function getLocationTree(): Promise<TreeNode<Location>[]> {
	return toTree(await listLocations());
}

export async function getCategoryTree(): Promise<TreeNode<InventoryCategory>[]> {
	return toTree(await listCategories());
}

export async function createLocation(input: {
	name: string;
	kind: LocationDoc['kind'];
	parentId: string | null;
}): Promise<void> {
	await collections
		.location()
		.insertOne({ _id: crypto.randomUUID(), ...input, createdAt: new Date() });
}

export async function createCategory(input: {
	name: string;
	parentId: string | null;
}): Promise<void> {
	await collections
		.category()
		.insertOne({ _id: crypto.randomUUID(), ...input, createdAt: new Date() });
}

/** Case-insensitive, accent-sensitive name match without needing an index. */
const NAME_COLLATION = { locale: 'en', strength: 2 } as const;

/**
 * "Create on the fly" from the item form: returns the existing category with
 * this name (any level, case-insensitive) or creates a new top-level one, so
 * a double tap or a typo-free retry never produces duplicates.
 */
export async function findOrCreateCategory(
	rawName: string
): Promise<{ id: string; name: string; created: boolean }> {
	const name = rawName.trim();
	const existing = await collections.category().findOne({ name }, { collation: NAME_COLLATION });
	if (existing) return { id: existing._id, name: existing.name, created: false };

	const id = crypto.randomUUID();
	await collections.category().insertOne({ _id: id, parentId: null, name, createdAt: new Date() });
	return { id, name, created: true };
}

/**
 * Same as `findOrCreateCategory`, for locations. A location made on the fly
 * is a top-level `room`; it can be moved/typed later from the locations page.
 */
export async function findOrCreateLocation(
	rawName: string
): Promise<{ id: string; name: string; created: boolean }> {
	const name = rawName.trim();
	const existing = await collections.location().findOne({ name }, { collation: NAME_COLLATION });
	if (existing) return { id: existing._id, name: existing.name, created: false };

	const id = crypto.randomUUID();
	await collections
		.location()
		.insertOne({ _id: id, parentId: null, name, kind: 'room', createdAt: new Date() });
	return { id, name, created: true };
}

/** `id` plus every descendant id (a subtree), from a flat parent/child list. */
function subtreeIds(rows: { _id: string; parentId: string | null }[], rootId: string): string[] {
	const out = [rootId];
	for (let i = 0; i < out.length; i++) {
		for (const r of rows) if (r.parentId === out[i]) out.push(r._id);
	}
	return out;
}

/**
 * Deletes a location and everything nested inside it; items stored there
 * keep existing but lose their location (the UI warns about both).
 */
export async function deleteLocation(id: string): Promise<void> {
	const all = await collections
		.location()
		.find({}, { projection: { _id: 1, parentId: 1 } })
		.toArray();
	const ids = subtreeIds(all as Pick<LocationDoc, '_id' | 'parentId'>[], id);
	await withTransaction(async (session) => {
		await collections.location().deleteMany({ _id: { $in: ids } }, { session });
		await collections
			.item()
			.updateMany({ locationId: { $in: ids } }, { $set: { locationId: null } }, { session });
	});
}

/** Same as `deleteLocation`, for categories. */
export async function deleteCategory(id: string): Promise<void> {
	const all = await collections
		.category()
		.find({}, { projection: { _id: 1, parentId: 1 } })
		.toArray();
	const ids = subtreeIds(all as Pick<CategoryDoc, '_id' | 'parentId'>[], id);
	await withTransaction(async (session) => {
		await collections.category().deleteMany({ _id: { $in: ids } }, { session });
		await collections
			.item()
			.updateMany({ categoryId: { $in: ids } }, { $set: { categoryId: null } }, { session });
	});
}

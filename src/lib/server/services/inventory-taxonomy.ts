import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	inventoryCategory,
	location,
	type InventoryCategory,
	type Location
} from '$lib/server/db/schema';

export interface TreeNode<T> {
	node: T;
	depth: number;
}

/** Flattens a parent/child table into a depth-first, indentation-ready list. */
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

export async function getLocationTree(): Promise<TreeNode<Location>[]> {
	const rows = await db.select().from(location).orderBy(asc(location.name));
	return toTree(rows);
}

export async function getCategoryTree(): Promise<TreeNode<InventoryCategory>[]> {
	const rows = await db.select().from(inventoryCategory).orderBy(asc(inventoryCategory.name));
	return toTree(rows);
}

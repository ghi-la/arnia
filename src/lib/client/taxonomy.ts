import { resolve } from '$app/paths';

export type TaxonomyKind = 'category' | 'location';

/**
 * Creates a category/location on the server and returns it as a combobox
 * option, or `null` when the request failed. An existing entry with the same
 * name is returned as-is rather than duplicated.
 */
export async function createTaxonomyEntry(
	kind: TaxonomyKind,
	name: string
): Promise<{ value: string; label: string } | null> {
	try {
		const res = await fetch(resolve('/inventory/taxonomy'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind, name })
		});
		if (!res.ok) return null;
		const entry = (await res.json()) as { id: string; name: string };
		return { value: entry.id, label: entry.name };
	} catch {
		return null;
	}
}

import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/auth/require-permission';
import {
	findOrCreateCategory,
	findOrCreateLocation
} from '$lib/server/services/inventory-taxonomy';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	kind: z.enum(['category', 'location']),
	name: z.string().trim().min(1).max(200)
});

/**
 * Creates a category or location without leaving the page — used by the
 * creatable comboboxes in the item form. Returns `{ id, name, created }`.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(locals.session, 'inventory.edit');

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'invalid' }, { status: 400 });

	const { kind, name } = parsed.data;
	const entry =
		kind === 'category' ? await findOrCreateCategory(name) : await findOrCreateLocation(name);
	return json(entry);
};

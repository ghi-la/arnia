import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { collections, isDuplicateKeyError, withTransaction } from '$lib/server/db';
import { toEntity } from '$lib/server/db/types';
import { requirePermission } from '$lib/server/auth/require-permission';
import { PERMISSIONS, isPermission } from '$lib/server/auth/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'settings.manage');

	const [roles, usage] = await Promise.all([
		collections.role().find().sort({ name: 1 }).toArray(),
		collections
			.userRole()
			.aggregate<{ _id: string; count: number }>([
				{ $group: { _id: '$roleId', count: { $sum: 1 } } }
			])
			.toArray()
	]);
	const usageByRole = new Map(usage.map((u) => [u._id, u.count]));

	return {
		roles: roles.map((r) => ({ ...toEntity(r), userCount: usageByRole.get(r._id) ?? 0 })),
		allPermissions: PERMISSIONS
	};
};

const createSchema = z.object({
	name: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500).optional()
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requirePermission(locals.session, 'settings.manage');
		const formData = await request.formData();
		const parsed = createSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description') || undefined
		});

		if (!parsed.success) {
			return fail(400, { createError: 'invalid' as const });
		}

		const key = parsed.data.name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');

		// Explicit check first: indexes are ensured in the background on a cold
		// start, so the unique index below is only a backstop for races.
		if (key && (await collections.role().findOne({ key }, { projection: { _id: 1 } }))) {
			return fail(400, { createError: 'duplicate' as const });
		}

		const now = new Date();
		try {
			await collections.role().insertOne({
				_id: crypto.randomUUID(),
				key: key || crypto.randomUUID(),
				name: parsed.data.name,
				description: parsed.data.description ?? null,
				isSystem: false,
				permissions: [],
				createdAt: now,
				updatedAt: now
			});
		} catch (err) {
			// `role.key` has a unique index (db/index.ts `ensureIndexes`).
			if (isDuplicateKeyError(err)) return fail(400, { createError: 'duplicate' as const });
			throw err;
		}
		return { created: parsed.data.name };
	},

	updatePermissions: async ({ request, locals }) => {
		requirePermission(locals.session, 'settings.manage');
		const formData = await request.formData();
		const roleId = String(formData.get('roleId'));
		const permissionKeys = formData.getAll('permissions').map(String).filter(isPermission);

		await collections
			.role()
			.updateOne(
				{ _id: roleId },
				{ $set: { permissions: [...new Set(permissionKeys)], updatedAt: new Date() } }
			);
		return { permissionsSaved: true };
	},

	delete: async ({ request, locals }) => {
		requirePermission(locals.session, 'settings.manage');
		const formData = await request.formData();
		const id = String(formData.get('id'));

		const target = await collections.role().findOne({ _id: id }, { projection: { isSystem: 1 } });
		if (target?.isSystem) {
			return fail(400, { deleteError: 'system' as const });
		}

		await withTransaction(async (session) => {
			await collections.role().deleteOne({ _id: id }, { session });
			await collections.userRole().deleteMany({ roleId: id }, { session });
		});
		return { deleted: true };
	}
};

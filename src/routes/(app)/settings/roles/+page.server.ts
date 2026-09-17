import { fail } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { role, rolePermission, userRole } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { PERMISSIONS, isPermission } from '$lib/server/auth/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'settings.manage');

	const [allRoles, allRolePermissions, usage] = await Promise.all([
		db.select().from(role).orderBy(asc(role.name)),
		db.select().from(rolePermission),
		db
			.select({ roleId: userRole.roleId, count: sql<number>`count(*)` })
			.from(userRole)
			.groupBy(userRole.roleId)
	]);

	const permissionsByRole = new Map<string, string[]>();
	for (const rp of allRolePermissions) {
		permissionsByRole.set(rp.roleId, [
			...(permissionsByRole.get(rp.roleId) ?? []),
			rp.permissionKey
		]);
	}
	const usageByRole = new Map(usage.map((u) => [u.roleId, Number(u.count)]));

	return {
		roles: allRoles.map((r) => ({
			...r,
			permissions: permissionsByRole.get(r.id) ?? [],
			userCount: usageByRole.get(r.id) ?? 0
		})),
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

		await db.insert(role).values({
			key: key || crypto.randomUUID(),
			name: parsed.data.name,
			description: parsed.data.description
		});
	},

	updatePermissions: async ({ request, locals }) => {
		requirePermission(locals.session, 'settings.manage');
		const formData = await request.formData();
		const roleId = String(formData.get('roleId'));
		const permissionKeys = formData.getAll('permissions').map(String).filter(isPermission);

		await db.transaction(async (tx) => {
			await tx.delete(rolePermission).where(eq(rolePermission.roleId, roleId));
			if (permissionKeys.length > 0) {
				await tx
					.insert(rolePermission)
					.values(permissionKeys.map((permissionKey) => ({ roleId, permissionKey })));
			}
		});
	},

	delete: async ({ request, locals }) => {
		requirePermission(locals.session, 'settings.manage');
		const formData = await request.formData();
		const id = String(formData.get('id'));

		const [target] = await db
			.select({ isSystem: role.isSystem })
			.from(role)
			.where(eq(role.id, id))
			.limit(1);
		if (target?.isSystem) {
			return fail(400, { deleteError: 'system' as const });
		}

		await db.delete(role).where(eq(role.id, id));
	}
};

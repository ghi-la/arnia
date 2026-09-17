import { fail } from '@sveltejs/kit';
import { and, asc, eq, isNull, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { invitation, role, user, userRole } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/require-permission';
import { createInvitation } from '$lib/server/services/invitations';
import { resetUserPasswordByAdmin } from '$lib/server/services/set-password';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'users.manage');

	const [allUsers, allRoles, assignments, pendingInvitations] = await Promise.all([
		db.select().from(user).orderBy(asc(user.name)),
		db.select().from(role).orderBy(asc(role.name)),
		db.select().from(userRole),
		db
			.select()
			.from(invitation)
			.where(and(isNull(invitation.acceptedAt), gt(invitation.expiresAt, new Date())))
			.orderBy(asc(invitation.email))
	]);

	const rolesByUser = new Map<string, string[]>();
	for (const a of assignments) {
		rolesByUser.set(a.userId, [...(rolesByUser.get(a.userId) ?? []), a.roleId]);
	}

	return {
		users: allUsers.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			isActive: u.isActive,
			roleIds: rolesByUser.get(u.id) ?? []
		})),
		roles: allRoles,
		pendingInvitations
	};
};

const inviteSchema = z.object({
	email: z.string().trim().pipe(z.email()),
	roleIds: z.array(z.string())
});

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		const session = requirePermission(locals.session, 'users.manage');

		const formData = await request.formData();
		const parsed = inviteSchema.safeParse({
			email: formData.get('email'),
			roleIds: formData.getAll('roleIds')
		});

		if (!parsed.success) {
			return fail(400, { inviteError: 'invalid' as const });
		}

		const result = await createInvitation({
			email: parsed.data.email,
			roleIds: parsed.data.roleIds,
			invitedBy: session.user.id,
			origin: url.origin
		});

		return { invite: result };
	},

	toggleActive: async ({ request, locals }) => {
		const session = requirePermission(locals.session, 'users.manage');
		const formData = await request.formData();
		const userId = String(formData.get('userId'));
		const nextActive = formData.get('nextActive') === 'true';

		if (userId === session.user.id) {
			return fail(400, { toggleError: 'self' as const });
		}

		await db.update(user).set({ isActive: nextActive }).where(eq(user.id, userId));
	},

	resetPassword: async ({ request, locals }) => {
		requirePermission(locals.session, 'users.manage');
		const formData = await request.formData();
		const userId = String(formData.get('userId'));

		const tempPassword = await resetUserPasswordByAdmin(userId);
		return { resetPasswordFor: userId, tempPassword };
	},

	updateRoles: async ({ request, locals }) => {
		requirePermission(locals.session, 'users.manage');
		const formData = await request.formData();
		const userId = String(formData.get('userId'));
		const roleIds = formData.getAll('roleIds').map(String);

		await db.transaction(async (tx) => {
			await tx.delete(userRole).where(eq(userRole.userId, userId));
			if (roleIds.length > 0) {
				await tx.insert(userRole).values(roleIds.map((roleId) => ({ userId, roleId })));
			}
		});
	},

	revokeInvite: async ({ request, locals }) => {
		requirePermission(locals.session, 'users.manage');
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await db.delete(invitation).where(eq(invitation.id, id));
	}
};

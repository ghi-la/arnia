import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { collections, withTransaction } from '$lib/server/db';
import { toEntity, userRoleId } from '$lib/server/db/types';
import { requirePermission } from '$lib/server/auth/require-permission';
import { createInvitation } from '$lib/server/services/invitations';
import { resetUserPasswordByAdmin } from '$lib/server/services/set-password';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.session, 'users.manage');

	const [allUsers, allRoles, assignments, pendingInvitations] = await Promise.all([
		collections.user().find().sort({ name: 1 }).toArray(),
		collections.role().find().sort({ name: 1 }).toArray(),
		collections.userRole().find().toArray(),
		collections
			.invitation()
			.find({ acceptedAt: null, expiresAt: { $gt: new Date() } })
			.sort({ email: 1 })
			.toArray()
	]);

	const rolesByUser = new Map<string, string[]>();
	for (const a of assignments) {
		rolesByUser.set(a.userId, [...(rolesByUser.get(a.userId) ?? []), a.roleId]);
	}

	return {
		users: allUsers.map((u) => ({
			id: u._id,
			name: u.name,
			email: u.email,
			isActive: u.isActive !== false,
			roleIds: rolesByUser.get(u._id) ?? []
		})),
		roles: allRoles.map(toEntity),
		// Never send token hashes to the browser.
		pendingInvitations: pendingInvitations.map((inv) => ({
			id: inv._id,
			email: inv.email,
			roleIds: inv.roleIds
		}))
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

		await collections.user().updateOne({ _id: userId }, { $set: { isActive: nextActive } });
		if (!nextActive) {
			// Sign them out everywhere right away, not at their next session refresh.
			await collections.session().deleteMany({ userId });
		}
		return { activated: nextActive };
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

		await withTransaction(async (session) => {
			await collections.userRole().deleteMany({ userId }, { session });
			if (roleIds.length > 0) {
				await collections.userRole().insertMany(
					[...new Set(roleIds)].map((roleId) => ({
						_id: userRoleId(userId, roleId),
						userId,
						roleId
					})),
					{ session }
				);
			}
		});
		return { rolesUpdated: true };
	},

	revokeInvite: async ({ request, locals }) => {
		requirePermission(locals.session, 'users.manage');
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await collections.invitation().deleteOne({ _id: id });
		return { revoked: true };
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import {
	getPendingInvitation,
	redeemInvitationForExistingUser
} from '$lib/server/services/invitations';
import { getOrganization } from '$lib/server/services/setup';
import type { Actions, PageServerLoad } from './$types';

const newUserSchema = z.object({
	name: z.string().trim().min(1).max(200),
	password: z.string().min(10).max(128)
});

const existingUserSchema = z.object({
	password: z.string().min(10).max(128)
});

export const load: PageServerLoad = async ({ params }) => {
	const [pending, org] = await Promise.all([getPendingInvitation(params.token), getOrganization()]);
	return { pending, orgName: org?.name ?? 'Arnia' };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const pending = await getPendingInvitation(params.token);
		if (!pending) {
			return fail(400, { error: 'invalid' as const });
		}

		const formData = await request.formData();

		if (pending.userExists) {
			const parsed = existingUserSchema.safeParse({ password: formData.get('password') });
			if (!parsed.success) {
				return fail(400, { error: 'weak_password' as const });
			}

			const [existingUser] = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, pending.email))
				.limit(1);
			if (!existingUser) {
				return fail(400, { error: 'invalid' as const });
			}

			await redeemInvitationForExistingUser({
				invitationId: pending.id,
				userId: existingUser.id,
				roleIds: pending.roleIds,
				newPassword: parsed.data.password
			});

			redirect(303, '/login');
		} else {
			const parsed = newUserSchema.safeParse({
				name: formData.get('name'),
				password: formData.get('password')
			});
			if (!parsed.success) {
				return fail(400, { error: 'weak_password' as const });
			}

			try {
				await auth.api.signUpEmail({
					body: { name: parsed.data.name, email: pending.email, password: parsed.data.password },
					headers: request.headers,
					asResponse: false
				});
			} catch (err) {
				if (err instanceof APIError) {
					return fail(400, { error: 'invalid' as const });
				}
				throw err;
			}
		}

		redirect(303, '/');
	}
};

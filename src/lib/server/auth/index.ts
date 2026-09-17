import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	account,
	invitation,
	organization,
	session,
	twoFactor as twoFactorTable,
	user as userTable,
	userRole,
	verification
} from '$lib/server/db/schema';
import { enqueueEmail } from '$lib/server/jobs/queue';
import {
	changeEmailConfirmationEmail,
	resetPasswordEmail,
	type Locale
} from '$lib/server/email/templates/auth-emails';

async function getOrgName(): Promise<string> {
	const [org] = await db.select({ name: organization.name }).from(organization).limit(1);
	return org?.name ?? 'Arnia';
}

/** Redeems the invitation matching this email (if any): assigns its roles and marks it accepted. */
async function redeemInvitationFor(userId: string, email: string) {
	const [pending] = await db
		.select()
		.from(invitation)
		.where(
			and(
				eq(invitation.email, email),
				isNull(invitation.acceptedAt),
				gt(invitation.expiresAt, new Date())
			)
		)
		.orderBy(invitation.createdAt)
		.limit(1);

	if (!pending) return;

	await db.transaction(async (tx) => {
		if (pending.roleIds.length > 0) {
			await tx
				.insert(userRole)
				.values(pending.roleIds.map((roleId) => ({ userId, roleId })))
				.onConflictDoNothing();
		}
		await tx
			.update(invitation)
			.set({ acceptedAt: new Date() })
			.where(eq(invitation.id, pending.id));
	});
}

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: { user: userTable, session, account, verification, twoFactor: twoFactorTable }
	}),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 10,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			const orgName = await getOrgName();
			const locale = (user as { locale?: string }).locale as Locale | undefined;
			const email = resetPasswordEmail({ locale: locale ?? 'it', orgName, url });
			await enqueueEmail({ ...email, to: user.email, template: 'reset-password' });
		}
	},
	emailVerification: {
		sendOnSignUp: false
	},
	user: {
		changeEmail: {
			enabled: true,
			sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
				const orgName = await getOrgName();
				const locale = (user as { locale?: string }).locale as Locale | undefined;
				const email = changeEmailConfirmationEmail({ locale: locale ?? 'it', orgName, url });
				await enqueueEmail({ ...email, to: newEmail, template: 'change-email' });
			}
		},
		additionalFields: {
			locale: {
				type: 'string',
				required: true,
				defaultValue: 'it'
			},
			isActive: {
				type: 'boolean',
				required: true,
				defaultValue: true
			}
		},
		// Arnia has no public self-registration (spec §2.2): every account is
		// created either by the first-run setup wizard's admin step (allowed
		// only while the instance has no users yet) or by redeeming an
		// invitation. This blocks a raw POST to /api/auth/sign-up/email
		// for any other email.
		validateUserInfo: async ({ user, source }) => {
			if (source.method !== 'email-password' || source.action !== 'create-user') return;

			const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(userTable);
			if (Number(count) === 0) return;

			const [pending] = await db
				.select({ id: invitation.id })
				.from(invitation)
				.where(
					and(
						eq(invitation.email, user.email as string),
						isNull(invitation.acceptedAt),
						gt(invitation.expiresAt, new Date())
					)
				)
				.limit(1);

			if (!pending) {
				return {
					error: 'no_pending_invitation',
					errorDescription: 'No pending invitation for this email.'
				};
			}
		}
	},
	databaseHooks: {
		user: {
			create: {
				// Invitation links are emailed to the address itself, so arriving
				// via one is treated as proof of ownership — no separate
				// "verify your email" step for invited users.
				before: async (user) => ({ data: { ...user, emailVerified: true } }),
				after: async (user) => {
					await redeemInvitationFor(user.id, user.email);
				}
			}
		}
	},
	// sveltekitCookies must be last: it relies on other plugins' hooks having
	// already run so it can forward whatever cookies they set.
	plugins: [twoFactor({ issuer: 'Arnia' }), sveltekitCookies(getRequestEvent)]
});

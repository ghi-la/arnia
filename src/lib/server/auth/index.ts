import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { building } from '$app/environment';
import { client, collections, db, withTransaction } from '$lib/server/db';
import { userRoleId } from '$lib/server/db/types';
import { sendEmail } from '$lib/server/email/send';
import {
	changeEmailConfirmationEmail,
	resetPasswordEmail,
	type Locale
} from '$lib/server/email/templates/auth-emails';

async function getOrgName(): Promise<string> {
	const org = await collections.organization().findOne({}, { projection: { name: 1 } });
	return org?.name ?? 'Arnia';
}

/** A pending (not accepted, not expired) invitation for this email, oldest first. */
function findPendingInvitation(email: string) {
	return collections
		.invitation()
		.findOne(
			{ email, acceptedAt: null, expiresAt: { $gt: new Date() } },
			{ sort: { createdAt: 1 } }
		);
}

/** Redeems the invitation matching this email (if any): assigns its roles and marks it accepted. */
async function redeemInvitationFor(userId: string, email: string) {
	const pending = await findPendingInvitation(email);
	if (!pending) return;

	await withTransaction(async (session) => {
		if (pending.roleIds.length > 0) {
			// Composite `_id` + upsert = "insert if missing" (no duplicate assignments).
			await collections.userRole().bulkWrite(
				pending.roleIds.map((roleId) => ({
					updateOne: {
						filter: { _id: userRoleId(userId, roleId) },
						update: { $setOnInsert: { userId, roleId } },
						upsert: true
					}
				})),
				{ session }
			);
		}
		await collections
			.invitation()
			.updateOne({ _id: pending._id }, { $set: { acceptedAt: new Date() } }, { session });
	});
}

export const auth = betterAuth({
	// `vite build` imports every server module once (route analysis) and Better
	// Auth refuses to construct without a secret — so builds get a throwaway
	// placeholder and need no secrets at all. At runtime it must be the real one.
	secret:
		process.env.BETTER_AUTH_SECRET ||
		(building ? 'build-time-placeholder-never-used-at-runtime-000000' : undefined),
	baseURL: process.env.BETTER_AUTH_URL,
	// `client` enables Better Auth's own transactions. Both are lazy proxies
	// (see db/index.ts), so nothing connects at import/build time.
	database: mongodbAdapter(db, { client }),
	advanced: {
		database: {
			// String UUIDs, like every other collection — not ObjectIds.
			generateId: () => crypto.randomUUID()
		}
	},
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 10,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			const orgName = await getOrgName();
			const locale = (user as { locale?: string }).locale as Locale | undefined;
			const email = resetPasswordEmail({ locale: locale ?? 'it', orgName, url });
			await sendEmail({ ...email, to: user.email, template: 'reset-password' });
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
				await sendEmail({ ...email, to: newEmail, template: 'change-email' });
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

			const anyUser = await collections.user().findOne({}, { projection: { _id: 1 } });
			if (!anyUser) return;

			const pending = await findPendingInvitation(user.email as string);

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

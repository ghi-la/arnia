import { randomBytes, createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invitation, organization, user, userRole } from '$lib/server/db/schema';
import { enqueueEmail } from '$lib/server/jobs/queue';
import { inviteEmail, type Locale } from '$lib/server/email/templates/auth-emails';
import { setUserPassword } from './set-password';

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

async function getOrgNameAndLocale(): Promise<{ name: string; locale: Locale }> {
	const [org] = await db
		.select({ name: organization.name, locale: organization.defaultLocale })
		.from(organization)
		.limit(1);
	return { name: org?.name ?? 'Arnia', locale: (org?.locale as Locale) ?? 'it' };
}

export interface CreateInvitationResult {
	url: string;
	emailSent: boolean;
}

/**
 * Creates (or refreshes) an invitation for `email` and, if an email provider
 * is configured, sends it. Always returns the plaintext URL too, so the
 * admin UI can offer a "copy link" fallback when `EMAIL_PROVIDER=none` or
 * sending fails (spec §2.2).
 */
export async function createInvitation(params: {
	email: string;
	roleIds: string[];
	invitedBy: string;
	origin: string;
}): Promise<CreateInvitationResult> {
	const { email, roleIds, invitedBy, origin } = params;

	const token = randomBytes(32).toString('base64url');
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

	await db.insert(invitation).values({ email, roleIds, tokenHash, invitedBy, expiresAt });

	const url = `${origin}/accept-invite/${token}`;

	// With no provider configured there is nothing to enqueue — the admin UI
	// shows the link to copy instead (spec §2.2).
	if ((process.env.EMAIL_PROVIDER ?? 'none') === 'none') {
		return { url, emailSent: false };
	}

	const { name: orgName, locale } = await getOrgNameAndLocale();
	let emailSent: boolean;
	try {
		const email_ = inviteEmail({ locale, orgName, url });
		await enqueueEmail({ ...email_, to: email, template: 'invite' });
		emailSent = true;
	} catch {
		emailSent = false;
	}

	return { url, emailSent };
}

export interface PendingInvitation {
	id: string;
	email: string;
	roleIds: string[];
	userExists: boolean;
}

/** Validates a raw (unhashed) token from an accept-invite link. */
export async function getPendingInvitation(token: string): Promise<PendingInvitation | null> {
	const tokenHash = hashToken(token);

	const [row] = await db
		.select()
		.from(invitation)
		.where(
			and(
				eq(invitation.tokenHash, tokenHash),
				isNull(invitation.acceptedAt),
				gt(invitation.expiresAt, new Date())
			)
		)
		.limit(1);

	if (!row) return null;

	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, row.email))
		.limit(1);

	return { id: row.id, email: row.email, roleIds: row.roleIds, userExists: !!existing };
}

/**
 * Redeems an invitation for an email that already has an account: sets the
 * new password, assigns any additional invited roles, and marks the
 * invitation accepted. (For a brand-new email, redemption instead happens
 * via `databaseHooks.user.create.after` in `src/lib/server/auth/index.ts`,
 * triggered by `signUpEmail`.)
 */
export async function redeemInvitationForExistingUser(params: {
	invitationId: string;
	userId: string;
	roleIds: string[];
	newPassword: string;
}): Promise<void> {
	const { invitationId, userId, roleIds, newPassword } = params;

	await setUserPassword(userId, newPassword);

	await db.transaction(async (tx) => {
		if (roleIds.length > 0) {
			await tx
				.insert(userRole)
				.values(roleIds.map((roleId) => ({ userId, roleId })))
				.onConflictDoNothing();
		}
		await tx
			.update(invitation)
			.set({ acceptedAt: new Date() })
			.where(eq(invitation.id, invitationId));
	});
}

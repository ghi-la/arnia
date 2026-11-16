import { randomInt } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { collections } from '$lib/server/db';

/**
 * Sets `userId`'s password directly (bypassing the email-link/session-based
 * endpoints, which don't fit either the admin-reset or invitation-accept
 * flows — see `docs/PLAN.md` §4) and revokes their existing sessions.
 * Writes Better Auth's own `account` / `session` collections in its format.
 */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
	const passwordHash = await hashPassword(newPassword);
	const now = new Date();

	await collections.account().updateOne(
		{ userId, providerId: 'credential' },
		{
			$set: { password: passwordHash, updatedAt: now },
			$setOnInsert: {
				_id: crypto.randomUUID(),
				userId,
				accountId: userId,
				providerId: 'credential',
				createdAt: now
			}
		},
		{ upsert: true }
	);

	await collections.session().deleteMany({ userId });
}

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 14): string {
	let out = '';
	for (let i = 0; i < length; i++) {
		out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
	}
	return out;
}

/** Admin-triggered reset: generates a temporary password and sets it. */
export async function resetUserPasswordByAdmin(userId: string): Promise<string> {
	const tempPassword = generateTempPassword();
	await setUserPassword(userId, tempPassword);
	return tempPassword;
}

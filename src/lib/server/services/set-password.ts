import { randomInt } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from '$lib/server/db';
import { account, session as sessionTable } from '$lib/server/db/schema';

/**
 * Sets `userId`'s password directly (bypassing the email-link/session-based
 * endpoints, which don't fit either the admin-reset or invitation-accept
 * flows — see `docs/PLAN.md` §4) and revokes their existing sessions.
 */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
	const passwordHash = await hashPassword(newPassword);

	const [credentialAccount] = await db
		.select({ id: account.id })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
		.limit(1);

	if (credentialAccount) {
		await db
			.update(account)
			.set({ password: passwordHash })
			.where(eq(account.id, credentialAccount.id));
	} else {
		await db.insert(account).values({
			id: crypto.randomUUID(),
			userId,
			accountId: userId,
			providerId: 'credential',
			password: passwordHash
		});
	}

	await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
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

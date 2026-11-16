import { collections } from '$lib/server/db';
import { userRoleId, type OrganizationDoc } from '$lib/server/db/types';
import { DEFAULT_ROLES } from '$lib/server/auth/permissions';

export async function getUserCount(): Promise<number> {
	return collections.user().countDocuments();
}

export async function getOrganization(): Promise<OrganizationDoc | null> {
	return collections.organization().findOne({ _id: 'default' });
}

export async function isSetupComplete(): Promise<boolean> {
	const org = await collections
		.organization()
		.findOne({ _id: 'default' }, { projection: { setupCompletedAt: 1 } });
	return !!org?.setupCompletedAt;
}

/** Creates the Admin role (all permissions) if missing and assigns it to `userId`. */
export async function ensureAdminRole(userId: string): Promise<void> {
	const adminDef = DEFAULT_ROLES.find((r) => r.key === 'admin')!;
	const roleId = await ensureRole(adminDef.key, adminDef.name, adminDef.permissions);

	await collections
		.userRole()
		.updateOne(
			{ _id: userRoleId(userId, roleId) },
			{ $setOnInsert: { userId, roleId } },
			{ upsert: true }
		);
}

/** Seeds the remaining default roles (everything but Admin, already created at setup). */
export async function seedDefaultRoles(): Promise<void> {
	for (const def of DEFAULT_ROLES) {
		if (def.key === 'admin') continue;
		await ensureRole(def.key, def.name, def.permissions);
	}
}

/** Idempotent: returns the existing role's id, or creates it as a system role. */
async function ensureRole(
	key: string,
	name: string,
	permissions: readonly string[]
): Promise<string> {
	const now = new Date();
	const result = await collections.role().findOneAndUpdate(
		{ key },
		{
			$setOnInsert: {
				_id: crypto.randomUUID(),
				key,
				name,
				description: null,
				isSystem: true,
				permissions: [...permissions],
				createdAt: now,
				updatedAt: now
			}
		},
		{ upsert: true, returnDocument: 'after', projection: { _id: 1 } }
	);
	return result!._id;
}

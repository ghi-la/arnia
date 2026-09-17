import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organization, role, rolePermission, user, userRole } from '$lib/server/db/schema';
import { DEFAULT_ROLES } from '$lib/server/auth/permissions';

export async function getUserCount(): Promise<number> {
	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(user);
	return Number(count);
}

export async function getOrganization() {
	const [org] = await db.select().from(organization).limit(1);
	return org ?? null;
}

export async function isSetupComplete(): Promise<boolean> {
	const org = await getOrganization();
	return !!org?.setupCompletedAt;
}

/** Creates the Admin role (all permissions) if missing and assigns it to `userId`. */
export async function ensureAdminRole(userId: string): Promise<void> {
	const adminDef = DEFAULT_ROLES.find((r) => r.key === 'admin')!;

	const [existing] = await db
		.select({ id: role.id })
		.from(role)
		.where(eq(role.key, 'admin'))
		.limit(1);

	const roleId =
		existing?.id ?? (await createRole(adminDef.key, adminDef.name, adminDef.permissions, true));

	await db.insert(userRole).values({ userId, roleId }).onConflictDoNothing();
}

/** Seeds the remaining default roles (everything but Admin, already created at setup). */
export async function seedDefaultRoles(): Promise<void> {
	for (const def of DEFAULT_ROLES) {
		if (def.key === 'admin') continue;
		const [existing] = await db
			.select({ id: role.id })
			.from(role)
			.where(eq(role.key, def.key))
			.limit(1);
		if (existing) continue;
		await createRole(def.key, def.name, def.permissions, true);
	}
}

async function createRole(
	key: string,
	name: string,
	permissions: readonly string[],
	isSystem: boolean
): Promise<string> {
	const [created] = await db
		.insert(role)
		.values({ key, name, isSystem })
		.returning({ id: role.id });

	if (permissions.length > 0) {
		await db
			.insert(rolePermission)
			.values(permissions.map((permissionKey) => ({ roleId: created.id, permissionKey })));
	}

	return created.id;
}

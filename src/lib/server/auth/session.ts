import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { role, rolePermission, userRole } from '$lib/server/db/schema';
import { isPermission, type Permission } from './permissions';

export interface SessionContext {
	user: {
		id: string;
		email: string;
		name: string;
		locale: string;
		isActive: boolean;
	};
	permissions: Set<Permission>;
	roles: string[];
}

/** Union of every permission granted by every role the user holds. */
export async function loadPermissions(userId: string): Promise<{
	permissions: Set<Permission>;
	roles: string[];
}> {
	const rows = await db
		.select({ roleKey: role.key, permissionKey: rolePermission.permissionKey })
		.from(userRole)
		.innerJoin(role, eq(userRole.roleId, role.id))
		.leftJoin(rolePermission, eq(rolePermission.roleId, role.id))
		.where(eq(userRole.userId, userId));

	const permissions = new Set<Permission>();
	const roles = new Set<string>();

	for (const row of rows) {
		roles.add(row.roleKey);
		if (row.permissionKey && isPermission(row.permissionKey)) {
			permissions.add(row.permissionKey);
		}
	}

	return { permissions, roles: [...roles] };
}

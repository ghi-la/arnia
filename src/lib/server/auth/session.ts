import { collections } from '$lib/server/db';
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
	const assignments = await collections.userRole().find({ userId }).toArray();
	if (assignments.length === 0) return { permissions: new Set(), roles: [] };

	const roles = await collections
		.role()
		.find({ _id: { $in: assignments.map((a) => a.roleId) } })
		.toArray();

	const permissions = new Set<Permission>();
	for (const r of roles) {
		for (const key of r.permissions) {
			if (isPermission(key)) permissions.add(key);
		}
	}

	return { permissions, roles: roles.map((r) => r.key) };
}

/**
 * Fine-grained permissions, defined in code (Arnia spec §2.3). Roles are
 * named sets of these, created/edited by the admin in the UI — see
 * `src/lib/server/db/schema/rbac.ts` (role/role_permission/user_role) and
 * `src/lib/server/auth/require-permission.ts`.
 */
export const PERMISSIONS = [
	'inventory.view',
	'inventory.edit',
	'inventory.adjust_stock',
	'events.view',
	'events.create',
	'events.manage',
	'events.close',
	'finance.view',
	'finance.record',
	'finance.approve',
	'finance.reports',
	'invoices.create',
	'invoices.send',
	'mail.view',
	'mail.manage_rules',
	'users.manage',
	'settings.manage',
	'audit.view'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
	return (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Default roles seeded on first run (`pnpm db:seed`) / the setup wizard.
 * Admins can rename, edit, delete, or add roles afterwards — these are just
 * a sensible starting point for an event-organizing association.
 */
export const DEFAULT_ROLES: { key: string; name: string; permissions: Permission[] }[] = [
	{
		key: 'admin',
		name: 'Admin',
		permissions: [...PERMISSIONS]
	},
	{
		key: 'board',
		name: 'Consiglio',
		permissions: [
			'inventory.view',
			'events.view',
			'events.manage',
			'finance.view',
			'finance.approve',
			'finance.reports',
			'invoices.create',
			'invoices.send',
			'mail.view',
			'audit.view'
		]
	},
	{
		key: 'treasurer',
		name: 'Tesoriere',
		permissions: [
			'finance.view',
			'finance.record',
			'finance.approve',
			'finance.reports',
			'invoices.create',
			'invoices.send',
			'audit.view'
		]
	},
	{
		key: 'warehouse_manager',
		name: 'Responsabile magazzino',
		permissions: ['inventory.view', 'inventory.edit', 'inventory.adjust_stock', 'events.view']
	},
	{
		key: 'event_manager',
		name: 'Responsabile eventi',
		permissions: [
			'events.view',
			'events.create',
			'events.manage',
			'events.close',
			'inventory.view',
			'finance.view'
		]
	},
	{
		key: 'volunteer',
		name: 'Volontario',
		permissions: ['events.view', 'inventory.view']
	},
	{
		key: 'read_only',
		name: 'Sola lettura',
		permissions: [
			'inventory.view',
			'events.view',
			'finance.view',
			'finance.reports',
			'mail.view',
			'audit.view'
		]
	}
];

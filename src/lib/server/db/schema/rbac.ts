import { relations, sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const role = pgTable('role', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	key: text('key').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	isSystem: boolean('is_system').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const rolePermission = pgTable(
	'role_permission',
	{
		roleId: text('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' }),
		// References Permission from src/lib/server/auth/permissions.ts — not a
		// DB-enforced enum, since permissions are defined in code (spec §2.3).
		permissionKey: text('permission_key').notNull()
	},
	(table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })]
);

export const userRole = pgTable(
	'user_role',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		roleId: text('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.roleId] }),
		index('user_role_role_id_idx').on(table.roleId)
	]
);

export const invitation = pgTable('invitation', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull(),
	roleIds: jsonb('role_ids')
		.$type<string[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	tokenHash: text('token_hash').notNull().unique(),
	invitedBy: text('invited_by')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Outbox table: every audited/notifiable domain event gets appended here in
 * the same transaction as the mutation (spec §4 "Architecture"). The audit
 * log and the notification system (Phase 7) both read from it.
 *
 * `eventId` intentionally has no FK yet — the `event` table doesn't exist
 * until Phase 4. It's a plain nullable id column until then.
 */
export const activityEvent = pgTable(
	'activity_event',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		type: text('type').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id').notNull(),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		eventId: text('event_id'),
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('activity_event_entity_idx').on(table.entityType, table.entityId),
		index('activity_event_created_at_idx').on(table.createdAt)
	]
);

export const emailLog = pgTable('email_log', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	to: text('to').notNull(),
	template: text('template').notNull(),
	status: text('status', { enum: ['queued', 'sent', 'failed'] })
		.notNull()
		.default('queued'),
	error: text('error'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const roleRelations = relations(role, ({ many }) => ({
	permissions: many(rolePermission),
	userRoles: many(userRole)
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
	role: one(role, { fields: [rolePermission.roleId], references: [role.id] })
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
	user: one(user, { fields: [userRole.userId], references: [user.id] }),
	role: one(role, { fields: [userRole.roleId], references: [role.id] })
}));

export type Role = typeof role.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;

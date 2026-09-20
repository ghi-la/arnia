import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Generic, polymorphic file storage (spec §2.10): item photos, receipts,
 * event covers, invoices, etc. all reference one row here via
 * (entity_type, entity_id) rather than each module having its own file
 * table. Files live on the local `uploads` Docker volume, under
 * `{year}/{entity_type}/{id}.{ext}` — see `src/lib/server/storage/index.ts`.
 * Never served directly by Caddy: always through `/attachments/[id]`, which
 * checks the caller can access the owning entity.
 */
export const attachment = pgTable(
	'attachment',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id').notNull(),
		path: text('path').notNull(),
		thumbnailPath: text('thumbnail_path'),
		mime: text('mime').notNull(),
		size: integer('size').notNull(),
		originalName: text('original_name').notNull(),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('attachment_entity_idx').on(table.entityType, table.entityId)]
);

export type Attachment = typeof attachment.$inferSelect;

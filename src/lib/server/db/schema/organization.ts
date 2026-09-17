import { boolean, check, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Singleton table: exactly one row (id = 1), created by the first-run setup wizard.
 * Holds instance-wide organization data and defaults (Arnia spec §2.1, §2.11).
 */
export const organization = pgTable(
	'organization',
	{
		id: integer('id').primaryKey().default(1),

		name: text('name').notNull(),
		street: text('street').notNull(),
		houseNumber: text('house_number').notNull(),
		postalCode: text('postal_code').notNull(),
		town: text('town').notNull(),
		country: text('country').notNull(),

		email: text('email').notNull(),
		phone: text('phone'),
		website: text('website'),
		logoPath: text('logo_path'),

		iban: text('iban'),
		isQrIban: boolean('is_qr_iban').notNull().default(false),

		defaultCurrency: text('default_currency').notNull().default('CHF'),
		timezone: text('timezone').notNull().default('Europe/Zurich'),
		defaultLocale: text('default_locale').notNull().default('it'),
		enabledLocales: jsonb('enabled_locales').$type<string[]>().notNull().default(['it']),

		terminology: jsonb('terminology').$type<Record<string, string>>().notNull().default({}),

		vatEnabled: boolean('vat_enabled').notNull().default(false),
		vatNumber: text('vat_number'),

		fiscalYearStartMonth: integer('fiscal_year_start_month').notNull().default(1),
		invoiceNumberPattern: text('invoice_number_pattern').notNull().default('{year}-{seq:04}'),
		invoiceDefaultDueDays: integer('invoice_default_due_days').notNull().default(30),

		setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [check('organization_singleton', sql`${table.id} = 1`)]
);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/db';
import { getOrganization, getUserCount } from '$lib/server/services/setup';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	name: z.string().trim().min(1).max(200),
	street: z.string().trim().min(1).max(200),
	houseNumber: z.string().trim().min(1).max(20),
	postalCode: z.string().trim().min(1).max(20),
	town: z.string().trim().min(1).max(200),
	country: z.string().trim().length(2),
	email: z.string().trim().pipe(z.email()),
	phone: z.string().trim().max(50).optional().or(z.literal('')),
	website: z.string().trim().max(200).optional().or(z.literal('')),
	iban: z
		.string()
		.trim()
		.transform((v) => v.replace(/\s+/g, '').toUpperCase())
		.pipe(
			z
				.string()
				.regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/)
				.or(z.literal(''))
		),
	defaultCurrency: z.string().trim().length(3),
	timezone: z.string().trim().min(1),
	defaultLocale: z.enum(['it', 'de', 'fr', 'en'])
});

export const load: PageServerLoad = async () => {
	if ((await getUserCount()) === 0) {
		redirect(303, '/setup/disclaimer');
	}
	const org = await getOrganization();
	return { org };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const raw = Object.fromEntries(formData);
		const parsed = schema.safeParse(raw);

		if (!parsed.success) {
			return fail(400, { values: raw, errors: z.flattenError(parsed.error).fieldErrors });
		}

		const { iban, ...rest } = parsed.data;
		const isQrIban = isQrIbanNumber(iban);

		const values = {
			...rest,
			phone: rest.phone || null,
			website: rest.website || null,
			iban: iban || null,
			isQrIban,
			enabledLocales: [rest.defaultLocale]
		};

		const now = new Date();
		await collections.organization().updateOne(
			{ _id: 'default' },
			{
				$set: { ...values, updatedAt: now },
				// Defaults for fields this step doesn't ask about (first save only).
				$setOnInsert: {
					logoPath: null,
					terminology: {},
					vatEnabled: false,
					vatNumber: null,
					fiscalYearStartMonth: 1,
					invoiceNumberPattern: '{year}-{seq:04}',
					invoiceDefaultDueDays: 30,
					setupCompletedAt: null,
					createdAt: now
				}
			},
			{ upsert: true }
		);

		redirect(303, '/setup/email');
	}
};

/** QR-IBAN: institution identifier (positions 5-9) is in range 30000-31999. */
function isQrIbanNumber(iban: string): boolean {
	if (!iban || iban.length < 9) return false;
	const institution = iban.slice(4, 9);
	const n = Number(institution);
	return n >= 30000 && n <= 31999;
}

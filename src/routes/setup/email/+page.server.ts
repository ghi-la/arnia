import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/db';
import { getOrganization } from '$lib/server/services/setup';
import { getEmailProvider } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

const localesSchema = z.object({
	locales: z.array(z.enum(['it', 'de', 'fr', 'en'])).min(1)
});

export const load: PageServerLoad = async () => {
	const org = await getOrganization();
	if (!org) {
		redirect(303, '/setup/organization');
	}
	return {
		org,
		emailProvider: process.env.EMAIL_PROVIDER ?? 'none'
	};
};

export const actions: Actions = {
	sendTest: async ({ locals }) => {
		if (!locals.session) redirect(303, '/login');

		try {
			await getEmailProvider().send({
				to: locals.session.user.email,
				subject: 'Arnia — test email',
				html: '<p>This is a test email from your Arnia instance. If you received this, email sending is working.</p>',
				text: 'This is a test email from your Arnia instance. If you received this, email sending is working.'
			});
			return { testResult: 'sent' as const };
		} catch (err) {
			return fail(400, {
				testResult: 'failed' as const,
				testError: err instanceof Error ? err.message : String(err)
			});
		}
	},

	continue: async ({ request }) => {
		const formData = await request.formData();
		const locales = formData.getAll('locales');
		const parsed = localesSchema.safeParse({ locales });

		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}

		await collections
			.organization()
			.updateOne(
				{ _id: 'default' },
				{ $set: { enabledLocales: parsed.data.locales, updatedAt: new Date() } }
			);

		redirect(303, '/setup/finish');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const credentialsSchema = z.object({
	email: z.string().trim().pipe(z.email()),
	password: z.string().min(1)
});

const codeSchema = z.object({
	code: z.string().trim().min(1)
});

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session) {
		redirect(303, '/');
	}
};

export const actions: Actions = {
	credentials: async ({ request }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '');
		const parsed = credentialsSchema.safeParse({ email, password: formData.get('password') });

		if (!parsed.success) {
			return fail(400, { step: 'credentials' as const, error: 'invalid' as const, email });
		}

		try {
			const result = await auth.api.signInEmail({
				body: parsed.data,
				headers: request.headers,
				asResponse: false
			});

			if ('twoFactorRedirect' in result && result.twoFactorRedirect) {
				return { step: 'twoFactor' as const };
			}
		} catch (err) {
			if (err instanceof APIError) {
				return fail(401, { step: 'credentials' as const, error: 'invalid' as const, email });
			}
			throw err;
		}

		redirect(303, '/');
	},

	verifyTwoFactor: async ({ request }) => {
		const formData = await request.formData();
		const useBackupCode = formData.get('useBackupCode') === 'true';
		const parsed = codeSchema.safeParse({ code: formData.get('code') });

		if (!parsed.success) {
			return fail(400, { step: 'twoFactor' as const, error: 'invalid' as const });
		}

		try {
			if (useBackupCode) {
				await auth.api.verifyBackupCode({
					body: { code: parsed.data.code },
					headers: request.headers,
					asResponse: false
				});
			} else {
				await auth.api.verifyTOTP({
					body: { code: parsed.data.code },
					headers: request.headers,
					asResponse: false
				});
			}
		} catch (err) {
			if (err instanceof APIError) {
				return fail(401, { step: 'twoFactor' as const, error: 'invalid' as const });
			}
			throw err;
		}

		redirect(303, '/');
	}
};

import { z } from 'zod';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	email: z.string().trim().pipe(z.email())
});

export const load: PageServerLoad = async ({ locals }) => {
	return {
		emailAvailable: (process.env.EMAIL_PROVIDER ?? 'none') !== 'none',
		hasSession: !!locals.session
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const parsed = schema.safeParse({ email: formData.get('email') });

		// Always respond the same way, whether or not the email matches an
		// account (spec §5: reset must not reveal account existence).
		if (parsed.success) {
			try {
				await auth.api.requestPasswordReset({
					body: { email: parsed.data.email, redirectTo: '/reset-password' },
					headers: request.headers,
					asResponse: false
				});
			} catch {
				// swallow — response is identical either way
			}
		}

		return { sent: true };
	}
};

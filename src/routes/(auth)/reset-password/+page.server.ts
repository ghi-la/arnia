import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	password: z.string().min(10).max(128)
});

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	const error = url.searchParams.get('error');
	return { hasToken: !!token && !error };
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const token = url.searchParams.get('token');
		if (!token) {
			return fail(400, { error: 'invalid_token' as const });
		}

		const formData = await request.formData();
		const parsed = schema.safeParse({ password: formData.get('password') });

		if (!parsed.success) {
			return fail(400, { error: 'weak_password' as const });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword: parsed.data.password, token },
				headers: request.headers,
				asResponse: false
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { error: 'invalid_token' as const });
			}
			throw err;
		}

		return { success: true };
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import { getUserCount, ensureAdminRole } from '$lib/server/services/setup';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	name: z.string().trim().min(1).max(200),
	email: z.string().trim().pipe(z.email()),
	password: z.string().min(10).max(128)
});

export const load: PageServerLoad = async () => {
	if ((await getUserCount()) > 0) {
		redirect(303, '/setup/organization');
	}
};

export const actions: Actions = {
	default: async (event) => {
		if ((await getUserCount()) > 0) {
			redirect(303, '/setup/organization');
		}

		const formData = await event.request.formData();
		const parsed = schema.safeParse({
			name: formData.get('name'),
			email: formData.get('email'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, {
				values: { name: formData.get('name'), email: formData.get('email') },
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const result = await auth.api.signUpEmail({
			body: parsed.data,
			headers: event.request.headers,
			asResponse: false
		});

		await ensureAdminRole(result.user.id);

		redirect(303, '/setup/organization');
	}
};

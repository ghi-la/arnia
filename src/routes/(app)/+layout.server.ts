import { redirect } from '@sveltejs/kit';
import { isSetupComplete } from '$lib/server/services/setup';
import { requireSession } from '$lib/server/auth/require-permission';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!(await isSetupComplete())) {
		redirect(303, '/setup');
	}

	const session = requireSession(locals.session);

	return {
		user: session.user,
		roles: session.roles,
		permissions: [...session.permissions]
	};
};

import { redirect } from '@sveltejs/kit';
import { getOrganization, getUserCount } from '$lib/server/services/setup';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const userCount = await getUserCount();
	if (userCount === 0) {
		redirect(303, '/setup/disclaimer');
	}

	const org = await getOrganization();
	if (!org) {
		redirect(303, '/setup/organization');
	}
	if (!org.email) {
		redirect(303, '/setup/organization');
	}

	redirect(303, '/setup/finish');
};

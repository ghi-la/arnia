import { redirect } from '@sveltejs/kit';
import { isSetupComplete } from '$lib/server/services/setup';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	if (await isSetupComplete()) {
		redirect(303, '/');
	}
};

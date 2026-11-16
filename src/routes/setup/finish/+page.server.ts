import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/db';
import { getOrganization } from '$lib/server/services/setup';
import { seedDefaultRoles } from '$lib/server/services/setup';
import type { Actions, PageServerLoad } from './$types';

const schema = z
	.object({
		vatEnabled: z.literal('on').optional(),
		vatNumber: z.string().trim().max(50).optional(),
		seedRoles: z.literal('on').optional()
	})
	.transform((v) => ({
		vatEnabled: v.vatEnabled === 'on',
		vatNumber: v.vatNumber || null,
		seedRoles: v.seedRoles === 'on'
	}));

export const load: PageServerLoad = async () => {
	const org = await getOrganization();
	if (!org) {
		redirect(303, '/setup/organization');
	}
	return { org };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const parsed = schema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}

		const { vatEnabled, vatNumber, seedRoles } = parsed.data;

		await collections
			.organization()
			.updateOne(
				{ _id: 'default' },
				{ $set: { vatEnabled, vatNumber, setupCompletedAt: new Date(), updatedAt: new Date() } }
			);

		if (seedRoles) {
			await seedDefaultRoles();
		}

		redirect(303, '/');
	}
};

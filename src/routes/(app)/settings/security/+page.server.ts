import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth';
import QRCode from 'qrcode';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import { collections } from '$lib/server/db';
import { requireSession } from '$lib/server/auth/require-permission';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = requireSession(locals.session);
	const row = await collections
		.user()
		.findOne({ _id: session.user.id }, { projection: { twoFactorEnabled: 1 } });

	return { twoFactorEnabled: !!row?.twoFactorEnabled };
};

const passwordSchema = z.object({ password: z.string().min(1) });
const codeSchema = z.object({ code: z.string().trim().min(1) });

export const actions: Actions = {
	enable: async ({ request, locals }) => {
		requireSession(locals.session);
		const formData = await request.formData();
		const parsed = passwordSchema.safeParse({ password: formData.get('password') });
		if (!parsed.success) {
			return fail(400, { step: 'enable' as const, error: 'invalid' as const });
		}

		try {
			const result = await auth.api.enableTwoFactor({
				body: { password: parsed.data.password },
				headers: request.headers,
				asResponse: false
			});

			if (result.method !== 'totp') {
				return fail(400, { step: 'enable' as const, error: 'invalid' as const });
			}

			const qrDataUrl = await QRCode.toDataURL(result.totpURI);
			return {
				step: 'verify' as const,
				qrDataUrl,
				backupCodes: result.backupCodes
			};
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { step: 'enable' as const, error: 'invalid' as const });
			}
			throw err;
		}
	},

	verify: async ({ request, locals }) => {
		requireSession(locals.session);
		const formData = await request.formData();
		const parsed = codeSchema.safeParse({ code: formData.get('code') });
		if (!parsed.success) {
			return fail(400, { step: 'verify' as const, error: 'invalid' as const });
		}

		try {
			await auth.api.verifyTOTP({
				body: { code: parsed.data.code },
				headers: request.headers,
				asResponse: false
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { step: 'verify' as const, error: 'invalid' as const });
			}
			throw err;
		}

		return { step: 'enabled' as const };
	},

	disable: async ({ request, locals }) => {
		requireSession(locals.session);
		const formData = await request.formData();
		const parsed = passwordSchema.safeParse({ password: formData.get('password') });
		if (!parsed.success) {
			return fail(400, { step: 'disable' as const, error: 'invalid' as const });
		}

		try {
			await auth.api.disableTwoFactor({
				body: { password: parsed.data.password },
				headers: request.headers,
				asResponse: false
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { step: 'disable' as const, error: 'invalid' as const });
			}
			throw err;
		}

		return { step: 'disabled' as const };
	}
};

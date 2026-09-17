import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { loadPermissions } from '$lib/server/auth/session';

const i18n: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

const session: Handle = async ({ event, resolve }) => {
	const authSession = await auth.api.getSession({ headers: event.request.headers });

	if (authSession) {
		const { permissions, roles } = await loadPermissions(authSession.user.id);
		event.locals.session = {
			user: {
				id: authSession.user.id,
				email: authSession.user.email,
				name: authSession.user.name,
				locale: (authSession.user as { locale?: string }).locale ?? 'it',
				isActive: (authSession.user as { isActive?: boolean }).isActive ?? true
			},
			permissions,
			roles
		};
	} else {
		event.locals.session = null;
	}

	return resolve(event);
};

const security: Handle = async ({ event, resolve }) => {
	const response = await svelteKitHandler({
		event,
		resolve: (e) => resolve(e),
		auth,
		building
	});

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(self), geolocation=(), microphone=(), payment=()'
	);

	return response;
};

export const handle = sequence(i18n, session, security);

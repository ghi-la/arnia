import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const i18n: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

const security: Handle = async ({ event, resolve }) => {
	// Auth/session resolution is wired up in Phase 2 (Better Auth).
	event.locals.session = null;

	const response = await resolve(event);

	// Content-Security-Policy is configured via `kit.csp` in svelte.config.js
	// (nonce mode), so SvelteKit sets that header itself.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(self), geolocation=(), microphone=(), payment=()'
	);

	return response;
};

export const handle = sequence(i18n, security);

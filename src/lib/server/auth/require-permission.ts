import { error, redirect } from '@sveltejs/kit';
import type { SessionContext } from './session';
import type { Permission } from './permissions';

/**
 * Central server-side permission gate. Call this at the top of every load
 * function, form action, and API endpoint that touches gated data — the UI
 * hiding a button is not enforcement (spec §2.3).
 */
export function requirePermission(
	session: SessionContext | null,
	permission: Permission
): SessionContext {
	const authed = requireSession(session);

	if (!authed.permissions.has(permission)) {
		error(403, `Missing permission: ${permission}`);
	}

	return authed;
}

/** Requires a signed-in, active user (no specific permission check). */
export function requireSession(session: SessionContext | null): SessionContext {
	if (!session) {
		redirect(303, '/login');
	}
	if (!session.user.isActive) {
		error(403, 'Account deactivated');
	}
	return session;
}

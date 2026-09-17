import { describe, expect, it } from 'vitest';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import { requirePermission, requireSession } from './require-permission';
import type { SessionContext } from './session';

function makeSession(overrides: Partial<SessionContext> = {}): SessionContext {
	return {
		user: { id: 'u1', email: 'a@b.com', name: 'A', locale: 'it', isActive: true },
		permissions: new Set(),
		roles: [],
		...overrides
	};
}

describe('requireSession', () => {
	it('redirects to /login when there is no session', () => {
		try {
			requireSession(null);
			expect.unreachable('should have thrown a redirect');
		} catch (err) {
			expect(isRedirect(err)).toBe(true);
			if (isRedirect(err)) {
				expect(err.status).toBe(303);
				expect(err.location).toBe('/login');
			}
		}
	});

	it('rejects a deactivated user with 403', () => {
		const session = makeSession({
			user: { id: 'u1', email: 'a@b.com', name: 'A', locale: 'it', isActive: false }
		});
		try {
			requireSession(session);
			expect.unreachable('should have thrown');
		} catch (err) {
			expect(isHttpError(err)).toBe(true);
			if (isHttpError(err)) expect(err.status).toBe(403);
		}
	});

	it('returns the session unchanged when active', () => {
		const session = makeSession();
		expect(requireSession(session)).toBe(session);
	});
});

describe('requirePermission', () => {
	it('rejects with 403 when the permission is missing', () => {
		const session = makeSession({ permissions: new Set(['inventory.view']) });
		try {
			requirePermission(session, 'finance.approve');
			expect.unreachable('should have thrown');
		} catch (err) {
			expect(isHttpError(err)).toBe(true);
			if (isHttpError(err)) expect(err.status).toBe(403);
		}
	});

	it('allows the action when the permission is present', () => {
		const session = makeSession({ permissions: new Set(['finance.approve']) });
		expect(requirePermission(session, 'finance.approve')).toBe(session);
	});

	it('redirects unauthenticated requests to /login before checking permissions', () => {
		try {
			requirePermission(null, 'users.manage');
			expect.unreachable('should have thrown a redirect');
		} catch (err) {
			expect(isRedirect(err)).toBe(true);
		}
	});
});

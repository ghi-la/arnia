import type { EmailProvider, SendEmailInput } from './types';

/**
 * No-op provider for fully offline instances (`EMAIL_PROVIDER=none`). Invite
 * and password-reset links are surfaced directly in the admin UI instead of
 * being emailed — see `docs/PLAN.md` §4.
 */
export class NoneProvider implements EmailProvider {
	async send(_input: SendEmailInput): Promise<boolean> {
		return false;
	}
}

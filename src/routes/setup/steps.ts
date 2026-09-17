import { m } from '$lib/paraglide/messages';

export const SETUP_STEPS = [
	{ path: '/setup/disclaimer', label: m.setup_step_disclaimer },
	{ path: '/setup/admin', label: m.setup_step_admin },
	{ path: '/setup/organization', label: m.setup_step_organization },
	{ path: '/setup/email', label: m.setup_step_locales_email },
	{ path: '/setup/finish', label: m.setup_step_finish }
] as const;

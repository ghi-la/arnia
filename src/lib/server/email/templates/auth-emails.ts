import { m } from '$lib/paraglide/messages';
import { locales } from '$lib/paraglide/runtime';
import { htmlToText, renderEmailLayout } from './layout';

export type Locale = (typeof locales)[number];
export type EmailContent = { subject: string; html: string; text: string };

const LINK_EXPIRES_HOURS = 72;

export function inviteEmail(params: {
	locale: Locale;
	orgName: string;
	url: string;
}): EmailContent {
	const { locale, orgName, url } = params;
	const subject = m.email_invite_subject({ orgName }, { locale });
	const html = renderEmailLayout({
		title: subject,
		orgName,
		bodyHtml: `<p>${m.email_invite_body({ orgName }, { locale })}</p><p>${m.email_link_expires({ hours: LINK_EXPIRES_HOURS }, { locale })}</p>`,
		ctaLabel: m.email_invite_cta({}, { locale }),
		ctaUrl: url,
		footerNote: m.email_footer_note({}, { locale })
	});

	return { subject, html, text: htmlToText(html) };
}

export function resetPasswordEmail(params: {
	locale: Locale;
	orgName: string;
	url: string;
}): EmailContent {
	const { locale, orgName, url } = params;
	const subject = m.email_reset_subject({}, { locale });
	const html = renderEmailLayout({
		title: subject,
		orgName,
		bodyHtml: `<p>${m.email_reset_body({}, { locale })}</p><p>${m.email_link_expires({ hours: 1 }, { locale })}</p>`,
		ctaLabel: m.email_reset_cta({}, { locale }),
		ctaUrl: url,
		footerNote: m.email_footer_note({}, { locale })
	});

	return { subject, html, text: htmlToText(html) };
}

export function changeEmailConfirmationEmail(params: {
	locale: Locale;
	orgName: string;
	url: string;
}): EmailContent {
	const { locale, orgName, url } = params;
	const subject = m.email_change_subject({}, { locale });
	const html = renderEmailLayout({
		title: subject,
		orgName,
		bodyHtml: `<p>${m.email_change_body({}, { locale })}</p><p>${m.email_link_expires({ hours: 1 }, { locale })}</p>`,
		ctaLabel: m.email_change_cta({}, { locale }),
		ctaUrl: url,
		footerNote: m.email_footer_note({}, { locale })
	});

	return { subject, html, text: htmlToText(html) };
}

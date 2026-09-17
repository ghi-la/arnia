import { NoneProvider } from './none-provider';
import { ResendProvider } from './resend-provider';
import { SmtpProvider } from './smtp-provider';
import type { EmailProvider } from './types';

export type { EmailProvider, SendEmailInput } from './types';

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
	if (cached) return cached;

	const provider = process.env.EMAIL_PROVIDER ?? 'none';

	switch (provider) {
		case 'resend': {
			if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
				throw new Error('EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM');
			}
			cached = new ResendProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM);
			break;
		}
		case 'smtp': {
			if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) {
				throw new Error('EMAIL_PROVIDER=smtp requires SMTP_HOST and EMAIL_FROM');
			}
			cached = new SmtpProvider({
				host: process.env.SMTP_HOST,
				port: Number(process.env.SMTP_PORT ?? 587),
				secure: process.env.SMTP_SECURE === 'true',
				user: process.env.SMTP_USER || undefined,
				password: process.env.SMTP_PASSWORD || undefined,
				from: process.env.EMAIL_FROM
			});
			break;
		}
		case 'none':
		default: {
			cached = new NoneProvider();
			break;
		}
	}

	return cached;
}

import { Resend } from 'resend';
import type { EmailProvider, SendEmailInput } from './types';

export class ResendProvider implements EmailProvider {
	private client: Resend;
	private from: string;

	constructor(apiKey: string, from: string) {
		this.client = new Resend(apiKey);
		this.from = from;
	}

	async send({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
		const { error } = await this.client.emails.send({
			from: this.from,
			to,
			subject,
			html,
			text
		});

		if (error) {
			throw new Error(`Resend error: ${error.name} — ${error.message}`);
		}

		return true;
	}
}

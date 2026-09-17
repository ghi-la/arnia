import nodemailer from 'nodemailer';
import type { EmailProvider, SendEmailInput } from './types';

export interface SmtpConfig {
	host: string;
	port: number;
	secure: boolean;
	user?: string;
	password?: string;
	from: string;
}

export class SmtpProvider implements EmailProvider {
	private transport: ReturnType<typeof nodemailer.createTransport>;
	private from: string;

	constructor(config: SmtpConfig) {
		this.from = config.from;
		this.transport = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: config.user
				? {
						user: config.user,
						pass: config.password
					}
				: undefined
		});
	}

	async send({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
		await this.transport.sendMail({
			from: this.from,
			to,
			subject,
			html,
			text
		});

		return true;
	}
}

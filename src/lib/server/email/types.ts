export interface SendEmailInput {
	to: string;
	subject: string;
	html: string;
	text: string;
}

export interface EmailProvider {
	/** @returns whether the email was actually sent (false for the `none` provider). */
	send(input: SendEmailInput): Promise<boolean>;
}

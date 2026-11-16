import { collections } from '../db';
import { getEmailProvider } from './index';

/**
 * Sends a transactional email right away (Vercel has no long-running worker
 * to drain a queue) and records the outcome in `email_log` — status only,
 * never the body (spec §2.2), so an admin can see failures.
 *
 * Throws if sending fails, so callers can tell the user (e.g. the invite
 * flow falls back to "copy this link").
 */
export async function sendEmail(input: {
	to: string;
	subject: string;
	html: string;
	text: string;
	template: string;
}): Promise<void> {
	const logId = crypto.randomUUID();
	await collections.emailLog().insertOne({
		_id: logId,
		to: input.to,
		template: input.template,
		status: 'sending',
		error: null,
		createdAt: new Date()
	});

	try {
		await getEmailProvider().send({
			to: input.to,
			subject: input.subject,
			html: input.html,
			text: input.text
		});
		await collections.emailLog().updateOne({ _id: logId }, { $set: { status: 'sent' } });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await collections
			.emailLog()
			.updateOne({ _id: logId }, { $set: { status: 'failed', error: message } });
		throw err;
	}
}

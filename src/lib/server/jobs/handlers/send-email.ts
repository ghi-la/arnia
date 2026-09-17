import type { Job } from 'pg-boss';
import { getEmailProvider } from '$lib/server/email';
import { db } from '$lib/server/db';
import { emailLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SendEmailJobData } from '../queue';

export async function sendEmailHandler(jobs: Job<SendEmailJobData>[]): Promise<void> {
	for (const job of jobs) {
		const { emailLogId, to, subject, html, text } = job.data;

		try {
			await getEmailProvider().send({ to, subject, html, text });
			await db.update(emailLog).set({ status: 'sent' }).where(eq(emailLog.id, emailLogId));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			await db
				.update(emailLog)
				.set({ status: 'failed', error: message })
				.where(eq(emailLog.id, emailLogId));
			throw err;
		}
	}
}

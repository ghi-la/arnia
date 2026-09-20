import type { Job } from 'pg-boss';
// Relative imports: this module is loaded by src/worker.ts under plain tsx
// in production, where `$lib/*` doesn't resolve — see docs/PLAN.md §4.
import { getEmailProvider } from '../../email';
import { db } from '../../db';
import { emailLog } from '../../db/schema';
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

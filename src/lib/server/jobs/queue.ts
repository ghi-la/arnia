import { PgBoss } from 'pg-boss';
import { db } from '$lib/server/db';
import { emailLog } from '$lib/server/db/schema';

export const QUEUE_SEND_EMAIL = 'send-email';

let startPromise: Promise<PgBoss> | undefined;

/**
 * Lazily starts (or reuses) a pg-boss instance for enqueueing jobs from the
 * `app` process. The `worker` process manages its own instance and calls
 * `.work()` on the same queues — see `src/worker.ts`.
 */
export function getBoss(): Promise<PgBoss> {
	if (startPromise) return startPromise;

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set');
	}

	const boss = new PgBoss(databaseUrl);
	boss.on('error', (error) => console.error('[pg-boss]', error));

	startPromise = boss
		.start()
		.then(async (b) => {
			await b.createQueue(QUEUE_SEND_EMAIL, {
				retryLimit: 5,
				retryBackoff: true,
				retryDelay: 5
			});
			return b;
		})
		.catch((err: unknown) => {
			startPromise = undefined;
			throw err;
		});

	return startPromise;
}

export interface SendEmailJobData {
	emailLogId: string;
	to: string;
	subject: string;
	html: string;
	text: string;
}

/**
 * Enqueues an email send and records it in `email_log` (status only — see
 * spec §2.2) so a failure is visible to the admin without ever storing the
 * message body.
 */
export async function enqueueEmail(input: {
	to: string;
	subject: string;
	html: string;
	text: string;
	template: string;
}): Promise<void> {
	const [row] = await db
		.insert(emailLog)
		.values({ to: input.to, template: input.template, status: 'queued' })
		.returning({ id: emailLog.id });

	const b = await getBoss();
	await b.send(QUEUE_SEND_EMAIL, {
		emailLogId: row.id,
		to: input.to,
		subject: input.subject,
		html: input.html,
		text: input.text
	} satisfies SendEmailJobData);
}

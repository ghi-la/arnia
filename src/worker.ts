/* eslint-disable no-console -- worker process: progress/status output is the point */
// pg-boss worker entry point, run as its own container/process (see docker-compose.yml).
// Job handlers (email sending, IMAP polling, reminders, digests, cleanup) are registered
// here as they're built in later phases.
import { PgBoss } from 'pg-boss';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set');
}

const boss = new PgBoss(databaseUrl);

boss.on('error', (error: Error) => console.error('[worker] pg-boss error:', error));

async function shutdown(signal: string) {
	console.log(`[worker] received ${signal}, shutting down...`);
	await boss.stop();
	process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
	await boss.start();
	console.log('[worker] started, waiting for jobs...');
} catch (err) {
	console.error('[worker] failed to start:', err);
	process.exit(1);
}

/* eslint-disable no-console -- CLI script: progress output is the point */
// Seeds default data for a fresh instance. Safe to re-run — everything here
// is idempotent (checks for an existing row before inserting).
//
//   pnpm db:seed          seed default roles (and, once those modules exist,
//                         default inventory/finance categories)
//   pnpm db:seed --demo   also creates a fictional demo organization with
//                         sample data, for screenshots and manual testing —
//                         never run this against a real instance
//
// Not implemented yet: --demo seeding needs inventory/events/finance/invoice
// modules that don't exist until later phases. Running with --demo today
// only seeds roles, same as without it.
import { client } from '$lib/server/db';
import { seedDefaultRoles } from '$lib/server/services/setup';

const demo = process.argv.includes('--demo');

await seedDefaultRoles();
console.log('[seed] default roles ready.');

if (demo) {
	console.log("[seed] --demo requested, but demo data seeding isn't implemented yet");
	console.log('[seed] (needs inventory/events/finance/invoices — see docs/PLAN.md §8)');
}

// The MongoDB connection pool (src/lib/server/db) keeps the process alive otherwise.
await client.close();

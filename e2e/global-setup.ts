import { chromium, type FullConfig } from '@playwright/test';

/**
 * Runs the first-run setup wizard once, before any test project starts, and
 * saves the resulting authenticated session to e2e/.auth/admin.json. Specs
 * that need to start already logged in use `test.use({ storageState: ... })`
 * with that file instead of re-running the wizard (which only works once —
 * it creates the singleton organization row and would race across the three
 * device projects otherwise).
 */
export default async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4173';

	const browser = await chromium.launch();
	const context = await browser.newContext({ baseURL, locale: 'en-US' });
	const page = await context.newPage();

	await page.goto('/');
	await page.waitForURL(/\/setup\/disclaimer$/);
	await page.getByLabel(/I have read and accept/).check();
	// This step's "Continue" is a plain link (no server round-trip needed), not
	// a form submit button, unlike every later step.
	await page.getByRole('link', { name: 'Continue' }).click();

	await page.waitForURL(/\/setup\/admin$/);
	await page.getByLabel('Name').fill('Test Admin');
	await page.getByLabel('Email').fill('admin@example.org');
	await page.getByLabel('Password', { exact: true }).fill('SuperSecret123');
	await page.getByRole('button', { name: 'Continue' }).click();

	await page.waitForURL(/\/setup\/organization$/);
	await page.getByLabel('Organization name').fill('Test Association');
	await page.getByLabel('Street').fill('Main Street');
	await page.getByLabel('House number').fill('1');
	await page.getByLabel('Postal code').fill('6900');
	await page.getByLabel('Town').fill('Lugano');
	await page.getByLabel('Email').fill('info@example.org');
	await page.getByRole('button', { name: 'Continue' }).click();

	await page.waitForURL(/\/setup\/email$/);
	await page.getByRole('button', { name: 'Continue' }).click();

	await page.waitForURL(/\/setup\/finish$/);
	await page.getByRole('button', { name: 'Complete setup' }).click();

	await page.waitForURL((url) => url.pathname === '/');

	await context.storageState({ path: 'e2e/.auth/admin.json' });
	await browser.close();
}

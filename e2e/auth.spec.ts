import { expect, test } from '@playwright/test';

// Starts unauthenticated (no storageState) — the setup wizard itself only
// runs once, in e2e/global-setup.ts, since it creates the singleton
// organization row and would race across the three device projects.
test.use({ storageState: { cookies: [], origins: [] } });

test('login rejects wrong password, then accepts the right one', async ({ page }) => {
	await page.goto('/login');

	await page.getByLabel('Email').fill('admin@example.org');
	await page.getByLabel('Password').fill('not-the-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByText('Incorrect email or password.')).toBeVisible();

	await page.getByLabel('Password').fill('SuperSecret123');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page).toHaveURL('/');
	await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
});

test('an unauthenticated visitor is redirected to /login', async ({ page }) => {
	await page.goto('/settings/users');
	await expect(page).toHaveURL(/\/login$/);
});

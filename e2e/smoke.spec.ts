import { expect, test } from '@playwright/test';

test('home page renders the app shell', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Arnia/);
	await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
});

test('primary navigation links are reachable', async ({ page }) => {
	await page.goto('/');

	await page.getByRole('link', { name: 'Events', exact: true }).click();
	await expect(page).toHaveURL(/\/events$/);
	await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
});

test('theme toggle switches between light and dark', async ({ page }) => {
	await page.goto('/');

	const html = page.locator('html');
	const toggle = page.getByRole('button', { name: 'Toggle theme' });

	const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
	await toggle.click();
	await expect(html).toHaveClass(wasDark ? /^(?!.*dark).*$/ : /dark/);
});

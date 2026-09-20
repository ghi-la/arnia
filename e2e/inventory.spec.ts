import { expect, test } from '@playwright/test';

// Starts already logged in as the admin created by e2e/global-setup.ts.
test.use({ storageState: 'e2e/.auth/admin.json' });

test('create a consumable item, then purchase, adjust, and consume its stock', async ({ page }) => {
	const itemName = `Test widget ${Date.now()}`;

	await page.goto('/inventory/items/new');
	await page.getByLabel('Name').fill(itemName);
	await page.getByLabel('Unit of measure').fill('pz');
	await page.getByRole('button', { name: 'Save item' }).click();

	await expect(page).toHaveURL(/\/inventory\/items\/[^/]+$/);
	await expect(page.getByRole('heading', { name: itemName })).toBeVisible();
	const itemId = page.url().split('/').pop()!;

	// Purchase 10 units at 2.00 each.
	await page.getByRole('link', { name: 'Stock movement' }).click();
	await expect(page).toHaveURL(/\/inventory\/movements\/new/);
	await page.locator('#itemId').selectOption(itemId);
	await page.locator('#type').selectOption('purchase');
	await page.getByLabel('Quantity').fill('10');
	await page.getByLabel('Unit cost').fill('2.00');
	await page.getByRole('button', { name: 'Record movement' }).click();

	await expect(page).toHaveURL(new RegExp(`/inventory/items/${itemId}$`));
	await expect(page.getByText('10 pz')).toBeVisible();

	// Adjustment increase: found 3 more than expected.
	await page.goto(`/inventory/movements/new?itemId=${itemId}`);
	await page.locator('#type').selectOption('adjustment');
	await page.getByLabel('Quantity').fill('3');
	await page.locator('#direction').selectOption('increase');
	await page.getByLabel('Reason').fill('Found extra stock during audit');
	await page.getByRole('button', { name: 'Record movement' }).click();

	await expect(page).toHaveURL(new RegExp(`/inventory/items/${itemId}$`));
	await expect(page.getByText('13 pz')).toBeVisible();

	// Adjustment decrease: found 5 less than expected.
	await page.goto(`/inventory/movements/new?itemId=${itemId}`);
	await page.locator('#type').selectOption('adjustment');
	await page.getByLabel('Quantity').fill('5');
	await page.locator('#direction').selectOption('decrease');
	await page.getByLabel('Reason').fill('Missing stock during audit');
	await page.getByRole('button', { name: 'Record movement' }).click();

	await expect(page).toHaveURL(new RegExp(`/inventory/items/${itemId}$`));
	await expect(page.getByText('8 pz')).toBeVisible();

	// Consuming more than available is rejected.
	await page.goto(`/inventory/movements/new?itemId=${itemId}`);
	await page.locator('#type').selectOption('consumption');
	await page.getByLabel('Quantity').fill('99');
	await page.getByRole('button', { name: 'Record movement' }).click();

	await expect(page.getByText(/Insufficient stock/)).toBeVisible();
	await expect(page).toHaveURL(/\/inventory\/movements\/new/);
});

test('scan page falls back to manual search and finds an item', async ({ page }) => {
	const itemName = `Scan target ${Date.now()}`;

	await page.goto('/inventory/items/new');
	await page.getByLabel('Name').fill(itemName);
	await page.getByLabel('Unit of measure').fill('pz');
	await page.getByRole('button', { name: 'Save item' }).click();
	await expect(page).toHaveURL(/\/inventory\/items\/[^/]+$/);
	const itemUrl = page.url();

	await page.goto('/inventory/scan');
	await expect(page.getByRole('heading', { name: 'Scan item' })).toBeVisible();

	await page.getByLabel('Or search manually').fill(itemName);
	await page.getByRole('button', { name: new RegExp(itemName) }).click();

	await expect(page).toHaveURL(itemUrl);
	await expect(page.getByRole('heading', { name: itemName })).toBeVisible();
});

test('inventory count records an adjustment when the counted quantity differs', async ({
	page
}) => {
	const itemName = `Count target ${Date.now()}`;

	await page.goto('/inventory/items/new');
	await page.getByLabel('Name').fill(itemName);
	await page.getByLabel('Unit of measure').fill('pz');
	await page.getByRole('button', { name: 'Save item' }).click();
	await expect(page).toHaveURL(/\/inventory\/items\/[^/]+$/);

	await page.goto('/inventory/count');
	await expect(page.getByRole('heading', { name: 'Inventory count' })).toBeVisible();

	await page.getByLabel('Item').fill(itemName);
	await page.getByRole('button', { name: new RegExp(itemName) }).click();

	await expect(page.getByText('Expected quantity: 0 pz')).toBeVisible();
	await page.getByLabel('Counted quantity').fill('4');
	await page.getByRole('button', { name: 'Record adjustment' }).click();

	await expect(page.getByText('1 items adjusted this session.')).toBeVisible();
});

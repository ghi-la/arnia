import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		// Deterministic locale for text-based assertions, independent of the
		// host/CI environment's own locale.
		locale: 'en-US'
	},
	webServer: {
		command: 'pnpm build && pnpm preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	projects: [
		{
			name: 'Mobile Safari (iPhone)',
			use: { ...devices['iPhone 17'] }
		},
		{
			name: 'Mobile Chrome (Pixel)',
			use: { ...devices['Pixel 9'] }
		},
		{
			name: 'Desktop Chrome',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});

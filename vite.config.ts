/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		}),
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
			strategies: 'generateSW',
			registerType: 'prompt',
			manifest: {
				name: 'Arnia',
				short_name: 'Arnia',
				description: 'Gestionale per associazioni non-profit',
				theme_color: '#0f766e',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icons/icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				navigateFallback: '/',
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
			},
			devOptions: {
				enabled: false
			}
		})
	],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**']
	}
});

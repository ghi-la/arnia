import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Vercel serverless functions (Node runtime — the MongoDB driver, sharp and
		// Better Auth need Node APIs, so never switch routes to `edge`).
		adapter: adapter(),
		alias: {
			$messages: 'src/lib/paraglide/messages',
			'$messages/*': 'src/lib/paraglide/messages/*'
		},
		csrf: {
			trustedOrigins: []
		},
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	}
};

export default config;

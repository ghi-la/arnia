/* eslint-disable no-console -- CLI script: progress output is the point */
// Rasterizes static/brand/icon.svg (and icon-maskable.svg) into the PNG sizes
// referenced by app.html and the PWA manifest (vite.config.ts).
// Re-run whenever the brand source SVGs change: `node scripts/generate-icons.mjs`
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brand = join(root, 'static', 'brand');
const iconsOut = join(root, 'static', 'icons');

await mkdir(iconsOut, { recursive: true });

const icon = join(brand, 'icon.svg');
const iconMaskable = join(brand, 'icon-maskable.svg');

const targets = [
	{ src: icon, out: join(root, 'static', 'favicon.png'), size: 48 },
	{ src: icon, out: join(iconsOut, 'apple-touch-icon.png'), size: 180 },
	{ src: icon, out: join(iconsOut, 'icon-192.png'), size: 192 },
	{ src: icon, out: join(iconsOut, 'icon-512.png'), size: 512 },
	{ src: iconMaskable, out: join(iconsOut, 'icon-maskable-512.png'), size: 512 }
];

for (const { src, out, size } of targets) {
	await sharp(src).resize(size, size).png().toFile(out);
	console.log(`generated ${out} (${size}x${size})`);
}

/**
 * Client-side image processing before upload (spec §2.10): resizes to a max
 * dimension and re-encodes as JPEG, run in the browser so a phone photo
 * doesn't ship multiple megabytes over a possibly-slow connection. Safari
 * decodes HEIC (iPhone photos) natively via `createImageBitmap`, so this
 * also transparently handles that case without a dedicated HEIC library —
 * other browsers' cameras don't produce HEIC in practice.
 *
 * PDFs are uploaded as-is; call this only for image files.
 */
export async function compressImage(
	file: File,
	options?: { maxDimension?: number; quality?: number }
): Promise<File> {
	const maxDimension = options?.maxDimension ?? 2400;
	const quality = options?.quality ?? 0.82;

	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
		const width = Math.round(bitmap.width * scale);
		const height = Math.round(bitmap.height * scale);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return file;

		ctx.drawImage(bitmap, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/jpeg', quality)
		);
		if (!blob) return file;

		const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
		return new File([blob], newName, { type: 'image/jpeg' });
	} finally {
		bitmap.close();
	}
}

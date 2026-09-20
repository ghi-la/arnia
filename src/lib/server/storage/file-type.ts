/**
 * Detects a file's real type from its magic bytes rather than trusting the
 * client-supplied MIME type or filename extension (spec §5: "Upload
 * validation by magic bytes"). Deliberately small: only the types Arnia
 * actually accepts as uploads.
 */
export type DetectedFileType = { mime: string; ext: string };

export function detectFileType(buffer: Uint8Array): DetectedFileType | null {
	if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
		return { mime: 'image/jpeg', ext: 'jpg' };
	}
	if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return { mime: 'image/png', ext: 'png' };
	}
	if (
		startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
		matchesAt(buffer, 8, [0x57, 0x45, 0x42, 0x50])
	) {
		return { mime: 'image/webp', ext: 'webp' };
	}
	if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) {
		return { mime: 'application/pdf', ext: 'pdf' };
	}
	// HEIC/HEIF: ISO base media file format with an 'ftyp' box whose brand is
	// one of the HEIC/HEIF variants. Safari can decode these directly; Arnia
	// also accepts the upload server-side (client-side compression normally
	// converts to JPEG first — see static assets note in spec §2.10 — but a
	// direct API call or unusual client shouldn't be rejected outright).
	if (
		matchesAt(buffer, 4, [0x66, 0x74, 0x79, 0x70]) &&
		['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].some((brand) =>
			matchesAt(
				buffer,
				8,
				Array.from(brand).map((c) => c.charCodeAt(0))
			)
		)
	) {
		return { mime: 'image/heic', ext: 'heic' };
	}
	return null;
}

function startsWith(buffer: Uint8Array, bytes: number[]): boolean {
	return matchesAt(buffer, 0, bytes);
}

function matchesAt(buffer: Uint8Array, offset: number, bytes: number[]): boolean {
	if (buffer.length < offset + bytes.length) return false;
	return bytes.every((byte, i) => buffer[offset + i] === byte);
}

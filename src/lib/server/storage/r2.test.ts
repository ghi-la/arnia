import { describe, expect, it } from 'vitest';
import { r2Endpoint, readR2Config, StorageNotConfiguredError } from './r2';

const complete = {
	R2_ACCOUNT_ID: 'abc123',
	R2_ACCESS_KEY_ID: 'key',
	R2_SECRET_ACCESS_KEY: 'secret',
	R2_BUCKET: 'arnia'
};

describe('readR2Config', () => {
	it('reads and trims a complete configuration', () => {
		expect(readR2Config({ ...complete, R2_BUCKET: ' arnia ', R2_JURISDICTION: ' EU ' })).toEqual({
			accountId: 'abc123',
			accessKeyId: 'key',
			secretAccessKey: 'secret',
			bucket: 'arnia',
			jurisdiction: 'eu'
		});
	});

	it('names every missing variable', () => {
		const err = (() => {
			try {
				readR2Config({ R2_ACCOUNT_ID: 'abc', R2_BUCKET: '  ' });
			} catch (e) {
				return e;
			}
		})();
		expect(err).toBeInstanceOf(StorageNotConfiguredError);
		expect((err as Error).message).toContain('R2_ACCESS_KEY_ID');
		expect((err as Error).message).toContain('R2_SECRET_ACCESS_KEY');
		expect((err as Error).message).toContain('R2_BUCKET');
		expect((err as Error).message).not.toContain('R2_ACCOUNT_ID');
	});
});

describe('r2Endpoint', () => {
	it('uses the default endpoint without a jurisdiction', () => {
		expect(r2Endpoint({ accountId: 'abc123', jurisdiction: '' })).toBe(
			'https://abc123.r2.cloudflarestorage.com'
		);
	});

	it('uses the jurisdiction-specific endpoint (EU buckets are unreachable otherwise)', () => {
		expect(r2Endpoint({ accountId: 'abc123', jurisdiction: 'eu' })).toBe(
			'https://abc123.eu.r2.cloudflarestorage.com'
		);
	});
});

import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, intlLocale } from './format';

describe('format', () => {
	it('pairs each UI language with its Swiss region', () => {
		expect(intlLocale('it')).toBe('it-CH');
		expect(intlLocale('fr')).toBe('fr-CH');
	});

	it('formats minor units as currency without float drift', () => {
		expect(formatMoney(123450, 'CHF', 'de')).toMatch(/CHF\s?1.234\.50/);
		expect(formatMoney(10n, 'CHF', 'de')).toMatch(/0\.10/);
	});

	it('formats dates in the Swiss day.month.year order', () => {
		expect(formatDate(new Date(Date.UTC(2026, 10, 16, 12)), 'de')).toBe('16.11.2026');
	});
});

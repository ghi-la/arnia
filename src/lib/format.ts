import { getLocale } from '$lib/paraglide/runtime';

/**
 * Locale-aware formatting for the UI. Arnia is Swiss-first, so each UI
 * language is paired with its Swiss region (`it-CH`, `de-CH`, `fr-CH`,
 * `en-CH`): dates as 16.11.2026, money as CHF 1’234.50, in the user's language.
 */
export function intlLocale(locale: string = getLocale()): string {
	return `${locale}-CH`;
}

/** Money is always integer minor units + currency code (CLAUDE.md), never floats. */
export function formatMoney(minor: number | bigint, currency: string, locale?: string): string {
	const major = typeof minor === 'bigint' ? Number(minor) / 100 : minor / 100;
	return new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency }).format(major);
}

export function formatDate(value: Date | string, locale?: string): string {
	return new Date(value).toLocaleDateString(intlLocale(locale));
}

export function formatDateTime(value: Date | string, locale?: string): string {
	return new Date(value).toLocaleString(intlLocale(locale), {
		dateStyle: 'short',
		timeStyle: 'short'
	});
}

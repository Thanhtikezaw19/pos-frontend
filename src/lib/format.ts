import { i18n } from './i18n.svelte.ts';

const money =new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function formatMoney(value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === '') return '-';
	return money.format(Number(value));
}

// Browsers don't reliably ship Burmese date data (Chrome falls back to English), so Myanmar
// dates are built by hand. Digits stay Latin.
const myanmarMonths = [
	'ဇန်နဝါရီ',
	'ဖေဖော်ဝါရီ',
	'မတ်',
	'ဧပြီ',
	'မေ',
	'ဇွန်',
	'ဇူလိုင်',
	'ဩဂုတ်',
	'စက်တင်ဘာ',
	'အောက်တိုဘာ',
	'နိုဝင်ဘာ',
	'ဒီဇင်ဘာ'
];

const pad = (n: number) => String(n).padStart(2, '0');

function myanmarDate(d: Date) {
	return `${d.getDate()} ${myanmarMonths[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value: string | null): string {
	if (!value) return '-';
	const d = new Date(value);
	if (i18n.locale === 'my') return `${myanmarDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	return d.toLocaleString('en-GB', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** Format a YYYY-MM-DD date (no time zone shift). */
export function formatDate(value: string): string {
	const [y, m, day] = value.split('-').map(Number);
	const d = new Date(y, m - 1, day);
	if (i18n.locale === 'my') return myanmarDate(d);
	return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Today's date as YYYY-MM-DD in the browser's local time zone. */
export function todayISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Money arithmetic in cents, so totals don't pick up floating-point errors. */
export function toCents(value: string | number): number {
	return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): string {
	return (cents / 100).toFixed(2);
}

export const shopName: string = import.meta.env.VITE_SHOP_NAME || 'My Shop';

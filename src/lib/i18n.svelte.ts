import en, { type MessageKey } from './locales/en.ts';
import my from './locales/my.ts';

export type Locale = 'en' | 'my';
export type { MessageKey };

const STORAGE_KEY = 'pos_locale';
const messages: Record<Locale, Record<MessageKey, string>> = { en, my };

export const locales: { code: Locale; label: string }[] = [
	{ code: 'en', label: 'EN' },
	{ code: 'my', label: 'မြန်မာ' }
];

function initialLocale(): Locale {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === 'en' || saved === 'my') return saved;
	} catch {
		// Storage unavailable; fall back to English.
	}
	return 'en';
}

export const i18n = $state<{ locale: Locale }>({ locale: initialLocale() });

export function setLocale(locale: Locale) {
	i18n.locale = locale;
	try {
		localStorage.setItem(STORAGE_KEY, locale);
	} catch {
		// The choice just won't persist.
	}
}

/** Translate a key, filling {placeholders} from params. Reads i18n.locale, so templates update on switch. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
	const text = messages[i18n.locale][key] ?? en[key];
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

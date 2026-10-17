export interface CurrencyDef {
  /** display symbol */
  sym: string;
  /** human name (settings screen) */
  name: string;
  /** minor-unit exponent — paisa/cents = 2 */
  exp: number;
}

/**
 * Default currencies. The app NEVER converts between currencies —
 * totals are always shown per-currency, side by side.
 */
export const CURRENCIES = {
  PKR: { sym: '₨', name: 'Pakistani Rupee', exp: 2 },
  USD: { sym: '$', name: 'US Dollar', exp: 2 },
  INR: { sym: '₹', name: 'Indian Rupee', exp: 2 },
  EUR: { sym: '€', name: 'Euro', exp: 2 },
} as const satisfies Record<string, CurrencyDef>;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Currency rows come from the database as plain strings — resolve them here.
 * Unknown codes (future/imported currencies) fall back to a 2-exponent def
 * instead of crashing, and display without a symbol.
 */
export function currencyDef(cur: CurrencyCode | string): CurrencyDef {
  return (CURRENCIES as Record<string, CurrencyDef>)[cur] ?? { sym: '', name: cur, exp: 2 };
}

/** "8500" → "8,500" — deterministic grouping, no Intl dependency. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse a user-typed amount ("1,200.50") into integer minor units.
 * Tolerates any separator noise; never returns NaN.
 */
export function toMinor(input: string | number, cur: CurrencyCode | string): number {
  const clean = String(input).replace(/[^0-9.]/g, '');
  const value = parseFloat(clean);
  if (!isFinite(value)) return 0;
  return Math.round(value * 10 ** currencyDef(cur).exp);
}

/** Minor units back to a display number (for math / editing). */
export function fromMinor(minor: number, cur: CurrencyCode | string): number {
  return minor / 10 ** currencyDef(cur).exp;
}

/**
 * Format integer minor units: 850000 → "₨8,500", -350050 → "−₨3,500.5".
 * `sign: true` forces an explicit + / − (use on signed amounts).
 */
export function formatMoney(
  minor: number,
  cur: CurrencyCode | string,
  opts: { sign?: boolean } = {},
): string {
  const { sym, exp } = currencyDef(cur);
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 10 ** exp);
  const frac = exp > 0 ? String(abs % 10 ** exp).padStart(exp, '0').replace(/0+$/, '') : '';
  const body = group(String(whole)) + (frac ? `.${frac}` : '');
  const sign = opts.sign ? (minor < 0 ? '−' : '+') : minor < 0 ? '−' : '';
  return `${sign}${sym}${body}`;
}

import type { IconName } from '@/components/Icon';
import type { AccountKind, ContactBalance, TxView } from '@/lib/db';
import { formatDay } from '@/lib/format';
import { formatMoney } from '@/lib/money';

/** Places and people can be removed — rows must render through dangling links. */
export const PLACE_LABEL = 'Removed place';
export const PERSON_LABEL = 'Removed person';

export function accountKindLabel(kind: AccountKind): string {
  return kind === 'cash' ? 'Cash' : kind === 'bank' ? 'Bank' : kind === 'wallet' ? 'Wallet' : 'Other';
}

export function accountIcon(kind: AccountKind): IconName {
  return kind === 'bank' ? 'bank' : kind === 'wallet' ? 'phone' : kind === 'cash' ? 'wallet' : 'box';
}

/** Money-direction icons: out → arrowUp, in → arrowDown, place-to-place → repeat. */
export function txIcon(t: TxView): IconName {
  switch (t.type) {
    case 'income':
    case 'borrow':
    case 'repay_in':
      return 'arrowDown';
    case 'transfer':
      return 'repeat';
    default:
      return 'arrowUp';
  }
}

export function txTitle(t: TxView): string {
  switch (t.type) {
    case 'expense':
    case 'income':
      return t.category_name ?? (t.type === 'expense' ? 'Expense' : 'Income');
    case 'transfer':
      return `Transfer to ${t.to_account_name ?? PLACE_LABEL}`;
    case 'lend':
      return `Lent to ${t.contact_name ?? PERSON_LABEL}`;
    case 'borrow':
      return `Borrowed from ${t.contact_name ?? PERSON_LABEL}`;
    case 'repay_in':
      return `${t.contact_name ?? PERSON_LABEL} paid you`;
    case 'repay_out':
      return `You paid ${t.contact_name ?? PERSON_LABEL}`;
  }
}

export function txSubtitle(t: TxView): string {
  const day = formatDay(t.occurred_at);
  const place = t.account_name ?? PLACE_LABEL;
  if (t.type === 'transfer') {
    return `${day} · ${place} → ${t.to_account_name ?? PLACE_LABEL}`;
  }
  return `${day} · ${place}`;
}

/** Signed minor units for display. Transfers are neutral (money just moved). */
export function txDisplayMinor(t: TxView): number {
  switch (t.type) {
    case 'income':
    case 'borrow':
    case 'repay_in':
      return t.amount_minor;
    case 'transfer':
      return t.amount_minor;
    case 'expense':
    case 'lend':
    case 'repay_out':
      return -t.amount_minor;
  }
}

export function txShowsSign(t: TxView): boolean {
  return t.type !== 'transfer';
}

/** "Owes you ₨2,000 · You owe ₨500" · "Settled up" — one line, any currencies. */
export function contactBalanceLabel(balances: ContactBalance[]): string {
  if (balances.length === 0) return 'Settled up';
  return balances
    .map((b) =>
      b.delta > 0
        ? `Owes you ${formatMoney(b.delta, b.currency)}`
        : `You owe ${formatMoney(-b.delta, b.currency)}`,
    )
    .join(' · ');
}

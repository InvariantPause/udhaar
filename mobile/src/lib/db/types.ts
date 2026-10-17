/**
 * Row shapes mirroring the SQLite schema (v1).
 * Money is ALWAYS integer minor units here — never floats, never strings.
 */

export type AccountKind = 'cash' | 'bank' | 'wallet' | 'other';

export type CategoryKind = 'expense' | 'income';

/**
 * The seven transaction types — the single source of truth for the ledger.
 *
 * Money direction (all amounts are stored positive, the type carries the sign):
 * - expense    money out of a place, no person
 * - income     money into a place, no person
 * - transfer   place → place
 * - lend       money out of a place, person's balance goes up (they owe you)
 * - borrow     money into a place, person's balance goes down (you owe them)
 * - repay_in   they paid you — money into a place, their balance drops
 * - repay_out  you paid them — money out of a place, their balance rises
 */
export type TxType = 'expense' | 'income' | 'transfer' | 'lend' | 'borrow' | 'repay_in' | 'repay_out';

export interface AccountRow {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  /** what this place held before the app existed (integer minor units) */
  opening_minor: number;
  /** used places are archived instead of deleted; archive is undoable */
  archived_at: number | null;
  deleted_at: number | null;
  created_at: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  kind: CategoryKind;
  sort: number;
  deleted_at: number | null;
  created_at: number;
}

export interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  deleted_at: number | null;
  created_at: number;
}

export interface TransactionRow {
  id: string;
  type: TxType;
  /** positive integer minor units; direction comes from `type` */
  amount_minor: number;
  currency: string;
  /** expense/lend/repay_out: paid from · income/borrow/repay_in: received in · transfer: from */
  account_id: string | null;
  /** transfer only — the destination place */
  to_account_id: string | null;
  /** expense/income only */
  category_id: string | null;
  /** lend/borrow/repay_in/repay_out only */
  contact_id: string | null;
  note: string | null;
  occurred_at: number;
  created_at: number;
  deleted_at: number | null;
}

/** A transaction joined with display names. A deleted link comes back as null → "Removed place". */
export interface TxView extends TransactionRow {
  account_name: string | null;
  to_account_name: string | null;
  category_name: string | null;
  contact_name: string | null;
}

export interface AccountWithBalance extends AccountRow {
  balance_minor: number;
}

/** One currency's balance with one person. Positive = they owe you. */
export interface ContactBalance {
  currency: string;
  delta: number;
}

export interface ContactWithBalances {
  contact: ContactRow;
  /** only non-zero currencies, in row order */
  balances: ContactBalance[];
}

export interface PlaceBalance {
  account: AccountRow;
  balance_minor: number;
}

/** "Where is my money" answer for one currency — never mixed across currencies. */
export interface CurrencySummary {
  currency: string;
  /** sum of every active place's balance */
  inPlaces: number;
  places: PlaceBalance[];
  /** positive per-contact deltas (they owe you) */
  lent: number;
  /** absolute value of negative per-contact deltas (you owe them) */
  borrowed: number;
}

export interface TxInput {
  /** present = update, absent = insert */
  id?: string;
  type: TxType;
  amount_minor: number;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  contact_id?: string | null;
  note?: string | null;
  /** defaults to now */
  occurred_at?: number;
}

export interface AccountInput {
  id?: string;
  name: string;
  kind: AccountKind;
  currency: string;
  opening_minor: number;
}

export interface ContactInput {
  id?: string;
  name: string;
  phone?: string | null;
  note?: string | null;
}

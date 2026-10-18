import { getDb, newId } from './db';
import type {
  AccountInput,
  AccountRow,
  AccountWithBalance,
  BudgetInput,
  BudgetWithSpent,
  CategoryKind,
  CategoryRow,
  CategoryTotal,
  ContactBalance,
  ContactInput,
  ContactRow,
  ContactWithBalances,
  CurrencySummary,
  ReportTotals,
  RecurringInput,
  RecurringRow,
  RecurringView,
  TransactionRow,
  TxInput,
  TxSearchOpts,
  TxView,
} from './types';

/**
 * Every read and write goes through here. All calls are synchronous
 * (expo-sqlite `*Sync`) — fast enough for this app's row counts, and it
 * keeps the whole UI free of loading states.
 *
 * Mutations never brew their own SQL correctness: sign conventions live in
 * the views (schema.ts), so a balance can't drift from its transactions.
 */

// ---------------------------------------------------------------- meta

export function getMeta(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [key]);
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb().runSync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [key, value]);
}

// ---------------------------------------------------------------- accounts (money places)

const ACCOUNT_COLS = `a.id, a.name, a.kind, a.currency, a.opening_minor, a.archived_at, a.deleted_at, a.created_at`;

export function listAccounts(opts: { includeArchived?: boolean } = {}): AccountWithBalance[] {
  const where = opts.includeArchived
    ? `a.deleted_at IS NULL`
    : `a.deleted_at IS NULL AND a.archived_at IS NULL`;
  return getDb().getAllSync<AccountWithBalance>(
    `SELECT ${ACCOUNT_COLS}, a.opening_minor + COALESCE(v.delta, 0) AS balance_minor
     FROM accounts a
     LEFT JOIN v_account_deltas v ON v.id = a.id
     WHERE ${where}
     ORDER BY a.created_at, a.name COLLATE NOCASE`,
  );
}

export function getAccount(id: string): AccountRow | null {
  return getDb().getFirstSync<AccountRow>(`SELECT * FROM accounts WHERE id = ?`, [id]);
}

export function accountHasEntries(id: string): boolean {
  const row = getDb().getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions WHERE deleted_at IS NULL AND (account_id = ? OR to_account_id = ?)`,
    [id, id],
  );
  return (row?.n ?? 0) > 0;
}

export function saveAccount(input: AccountInput): string {
  const d = getDb();
  const name = input.name.trim();
  if (!name) throw new Error('Give the place a name');
  const id = input.id ?? newId();
  if (input.id) {
    d.runSync(
      `UPDATE accounts SET name = ?, kind = ?, currency = ?, opening_minor = ? WHERE id = ?`,
      [name, input.kind, input.currency, Math.round(input.opening_minor), id],
    );
  } else {
    d.runSync(
      `INSERT INTO accounts (id, name, kind, currency, opening_minor, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, input.kind, input.currency, Math.round(input.opening_minor), Date.now()],
    );
  }
  setMeta('last_account_id', id);
  return id;
}

/**
 * Deletion rule: an unused place is soft-deleted; a place with entries is
 * archived instead (history keeps rendering against it). Both are undoable.
 */
export function deleteAccount(id: string): 'deleted' | 'archived' {
  const d = getDb();
  if (accountHasEntries(id)) {
    d.runSync(`UPDATE accounts SET archived_at = ? WHERE id = ?`, [Date.now(), id]);
    return 'archived';
  }
  d.runSync(`UPDATE accounts SET deleted_at = ? WHERE id = ?`, [Date.now(), id]);
  return 'deleted';
}

/** Undo for both delete and archive. */
export function restoreAccount(id: string): void {
  getDb().runSync(`UPDATE accounts SET deleted_at = NULL, archived_at = NULL WHERE id = ?`, [id]);
}

export function archiveAccount(id: string): void {
  getDb().runSync(`UPDATE accounts SET archived_at = ? WHERE id = ?`, [Date.now(), id]);
}

export function unarchiveAccount(id: string): void {
  getDb().runSync(`UPDATE accounts SET archived_at = NULL WHERE id = ?`, [id]);
}

// ---------------------------------------------------------------- categories

export function listCategories(kind: CategoryKind): CategoryRow[] {
  return getDb().getAllSync<CategoryRow>(
    `SELECT * FROM categories WHERE deleted_at IS NULL AND kind = ? ORDER BY sort, created_at`,
    [kind],
  );
}

/** Idempotent by (kind, name) — returns the existing id instead of a duplicate. */
export function addCategory(name: string, kind: CategoryKind): string {
  const d = getDb();
  const clean = name.trim();
  if (!clean) throw new Error('Give the category a name');
  const existing = d.getFirstSync<{ id: string }>(
    `SELECT id FROM categories WHERE deleted_at IS NULL AND kind = ? AND name = ? COLLATE NOCASE`,
    [kind, clean],
  );
  if (existing) return existing.id;
  const id = newId();
  const max = d.getFirstSync<{ m: number | null }>(
    `SELECT MAX(sort) AS m FROM categories WHERE kind = ?`,
    [kind],
  );
  d.runSync(
    `INSERT INTO categories (id, name, kind, sort, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, clean, kind, (max?.m ?? 0) + 1, Date.now()],
  );
  return id;
}

// ---------------------------------------------------------------- contacts (people)

export function listContacts(): ContactWithBalances[] {
  return collectContacts(
    getDb().getAllSync<ContactRow & { balance_currency: string | null; balance_delta: number | null }>(
      `SELECT c.*, v.currency AS balance_currency, v.delta AS balance_delta
       FROM contacts c
       LEFT JOIN v_contact_deltas v ON v.id = c.id
       WHERE c.deleted_at IS NULL
       ORDER BY c.name COLLATE NOCASE, c.created_at`,
    ),
  );
}

export function getContact(id: string): ContactWithBalances | null {
  const rows = getDb().getAllSync<ContactRow & { balance_currency: string | null; balance_delta: number | null }>(
    `SELECT c.*, v.currency AS balance_currency, v.delta AS balance_delta
     FROM contacts c
     LEFT JOIN v_contact_deltas v ON v.id = c.id
     WHERE c.deleted_at IS NULL AND c.id = ?`,
    [id],
  );
  return collectContacts(rows)[0] ?? null;
}

function collectContacts(
  rows: (ContactRow & { balance_currency: string | null; balance_delta: number | null })[],
): ContactWithBalances[] {
  const map = new Map<string, ContactWithBalances>();
  for (const r of rows) {
    let entry = map.get(r.id);
    if (!entry) {
      const contact: ContactRow = {
        id: r.id,
        name: r.name,
        phone: r.phone,
        note: r.note,
        deleted_at: r.deleted_at,
        created_at: r.created_at,
      };
      entry = { contact, balances: [] };
      map.set(r.id, entry);
    }
    if (r.balance_currency && r.balance_delta) {
      entry.balances.push({ currency: r.balance_currency, delta: r.balance_delta });
    }
  }
  return [...map.values()];
}

export function saveContact(input: ContactInput): string {
  const d = getDb();
  const name = input.name.trim();
  if (!name) throw new Error('Give the person a name');
  const phone = input.phone?.trim() || null;
  const note = input.note?.trim() || null;
  const id = input.id ?? newId();
  if (input.id) {
    d.runSync(`UPDATE contacts SET name = ?, phone = ?, note = ? WHERE id = ?`, [name, phone, note, id]);
  } else {
    d.runSync(
      `INSERT INTO contacts (id, name, phone, note, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, name, phone, note, Date.now()],
    );
  }
  return id;
}

/** Undo token for a contact delete — the soft timestamp and the ledger it took down. */
export interface ContactDeleteToken {
  contactId: string;
  at: number;
  txCount: number;
}

/** Deleting a person cascades their ledger (soft, in one transaction). Undo restores both. */
export function deleteContact(id: string): ContactDeleteToken {
  const d = getDb();
  const at = Date.now();
  let txCount = 0;
  d.withTransactionSync(() => {
    const row = d.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM transactions WHERE contact_id = ? AND deleted_at IS NULL`,
      [id],
    );
    txCount = row?.n ?? 0;
    d.runSync(`UPDATE contacts SET deleted_at = ? WHERE id = ?`, [at, id]);
    d.runSync(`UPDATE transactions SET deleted_at = ? WHERE contact_id = ? AND deleted_at IS NULL`, [at, id]);
  });
  return { contactId: id, at, txCount };
}

export function restoreContact(token: ContactDeleteToken): void {
  const d = getDb();
  d.withTransactionSync(() => {
    d.runSync(`UPDATE contacts SET deleted_at = NULL WHERE id = ? AND deleted_at = ?`, [token.contactId, token.at]);
    d.runSync(`UPDATE transactions SET deleted_at = NULL WHERE contact_id = ? AND deleted_at = ?`, [token.contactId, token.at]);
  });
}

// ---------------------------------------------------------------- transactions

const TX_SELECT = `
  SELECT t.*,
         a.name  AS account_name,
         ta.name AS to_account_name,
         c.name  AS contact_name,
         cat.name AS category_name
  FROM transactions t
  LEFT JOIN accounts   a   ON a.id = t.account_id
  LEFT JOIN accounts   ta  ON ta.id = t.to_account_id
  LEFT JOIN contacts   c   ON c.id = t.contact_id
  LEFT JOIN categories cat ON cat.id = t.category_id`;

export function listRecentTxs(limit = 60): TxView[] {
  return getDb().getAllSync<TxView>(
    `${TX_SELECT} WHERE t.deleted_at IS NULL ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ?`,
    [limit],
  );
}

export function listContactTxs(contactId: string, limit = 200): TxView[] {
  return getDb().getAllSync<TxView>(
    `${TX_SELECT} WHERE t.deleted_at IS NULL AND t.contact_id = ? ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ?`,
    [contactId, limit],
  );
}

/**
 * Entry search — free text over note, people, places, categories, and the
 * amount itself (SQLite LIKE is case-insensitive for ASCII).
 *
 * Amounts match the way they're typed: "250", "1,500" and "5.5" all hit via
 * printf("%.2f") over the stored minor units — no conversion guesswork in
 * JS. The app only ships 2-digit currencies (paisa/cents = exponent 2).
 */
export function searchTxs(opts: TxSearchOpts): TxView[] {
  const clauses: string[] = ['t.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  const kind = opts.kind ?? 'all';
  if (kind === 'udhaar') {
    clauses.push(`t.type IN ('lend','borrow','repay_in','repay_out')`);
  } else if (kind !== 'all') {
    clauses.push('t.type = ?');
    params.push(kind);
  }
  if (opts.from != null) {
    clauses.push('t.occurred_at >= ?');
    params.push(opts.from);
  }
  if (opts.to != null) {
    clauses.push('t.occurred_at < ?');
    params.push(opts.to);
  }

  const q = opts.query.trim();
  if (q) {
    const like = `%${q}%`;
    const amount = q.replace(/[\s,]/g, '');
    clauses.push(
      amount
        ? `(t.note LIKE ? OR a.name LIKE ? OR ta.name LIKE ? OR c.name LIKE ? OR cat.name LIKE ?
            OR printf('%.2f', t.amount_minor / 100.0) LIKE ?)`
        : '(t.note LIKE ? OR a.name LIKE ? OR ta.name LIKE ? OR c.name LIKE ? OR cat.name LIKE ?)',
    );
    params.push(like, like, like, like, like, ...(amount ? [`%${amount}%`] : []));
  }

  return getDb().getAllSync<TxView>(
    `${TX_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ?`,
    [...params, opts.limit ?? 200],
  );
}

export function getTx(id: string): TransactionRow | null {
  return getDb().getFirstSync<TransactionRow>(`SELECT * FROM transactions WHERE id = ?`, [id]);
}

/**
 * Create or update an entry. Validation is deliberately strict here — the
 * sheet's disabled-button rules and this function must agree.
 * Currency always follows the place(s) involved; cross-currency is refused.
 */
export function saveTx(input: TxInput): string {
  const d = getDb();
  const type = input.type;
  const amount = Math.round(Math.abs(input.amount_minor));
  if (!(amount > 0)) throw new Error('Enter an amount first');

  const accountId = input.account_id ?? null;
  const toAccountId = type === 'transfer' ? (input.to_account_id ?? null) : null;
  const isUdhaar = type === 'lend' || type === 'borrow' || type === 'repay_in' || type === 'repay_out';
  const contactId = isUdhaar ? (input.contact_id ?? null) : null;
  const categoryId = type === 'expense' || type === 'income' ? (input.category_id ?? null) : null;

  if (!accountId) throw new Error('Pick a money place');
  const account = mustAccount(accountId);
  let currency = account.currency;

  if (type === 'transfer') {
    if (!toAccountId) throw new Error('Pick where the money went');
    if (toAccountId === accountId) throw new Error('Pick two different places');
    const to = mustAccount(toAccountId);
    if (to.currency !== account.currency) {
      throw new Error(`Both places must use ${account.currency}`);
    }
    currency = account.currency;
  }

  if (isUdhaar && !contactId) throw new Error('Pick a person');

  const occurredAt = input.occurred_at && input.occurred_at > 0 ? input.occurred_at : Date.now();
  const note = input.note?.trim() || null;
  const id = input.id ?? newId();

  d.withTransactionSync(() => {
    if (input.id) {
      d.runSync(
        `UPDATE transactions SET type = ?, amount_minor = ?, currency = ?, account_id = ?, to_account_id = ?,
         category_id = ?, contact_id = ?, note = ?, occurred_at = ? WHERE id = ?`,
        [type, amount, currency, accountId, toAccountId, categoryId, contactId, note, occurredAt, id],
      );
    } else {
      d.runSync(
        `INSERT INTO transactions (id, type, amount_minor, currency, account_id, to_account_id, category_id, contact_id, note, occurred_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, amount, currency, accountId, toAccountId, categoryId, contactId, note, occurredAt, Date.now()],
      );
    }
    // Fast-capture defaults: next entry starts where this one happened.
    setMeta('last_account_id', accountId);
    if (categoryId) setMeta('last_category_id', categoryId);
  });

  return id;
}

function mustAccount(id: string): AccountRow {
  const row = getAccount(id);
  if (!row) throw new Error('That money place is gone');
  return row;
}

/** Soft-delete; returns the timestamp that undo needs. */
export function deleteTx(id: string): number {
  const at = Date.now();
  getDb().runSync(`UPDATE transactions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`, [at, id]);
  return at;
}

export function restoreTx(id: string, at: number): void {
  getDb().runSync(`UPDATE transactions SET deleted_at = NULL WHERE id = ? AND deleted_at = ?`, [id, at]);
}

// ---------------------------------------------------------------- budgets

/**
 * Monthly caps per category + currency, with what's been spent in [from, to).
 * Currency-bound on purpose: the app never converts, so a cap only ever
 * tracks expenses recorded in the same currency.
 */
export function listBudgets(from: number, to: number): BudgetWithSpent[] {
  return getDb().getAllSync<BudgetWithSpent>(
    `SELECT b.id, b.category_id, b.currency, b.amount_minor, b.deleted_at, b.created_at,
            c.name AS category_name,
            COALESCE((
              SELECT SUM(t.amount_minor) FROM transactions t
              WHERE t.deleted_at IS NULL AND t.type = 'expense'
                AND t.category_id = b.category_id AND t.currency = b.currency
                AND t.occurred_at >= ? AND t.occurred_at < ?
            ), 0) AS spent
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.deleted_at IS NULL
     ORDER BY (c.sort IS NULL), COALESCE(c.sort, 0), b.created_at`,
    [from, to],
  );
}

/**
 * One live budget per category + currency. Editing one keeps its id; moving
 * it to another category or currency retires the old row first.
 */
export function saveBudget(input: BudgetInput): string {
  const d = getDb();
  const amount = Math.round(Math.abs(input.amount_minor));
  if (!(amount > 0)) throw new Error('Enter an amount first');
  const now = Date.now();

  const orig = input.id
    ? d.getFirstSync<{ id: string; category_id: string; currency: string }>(
        `SELECT id, category_id, currency FROM budgets WHERE id = ? AND deleted_at IS NULL`,
        [input.id],
      )
    : null;
  const keepsId = !!orig && orig.category_id === input.category_id && orig.currency === input.currency;
  const existing = keepsId
    ? null
    : d.getFirstSync<{ id: string }>(
        `SELECT id FROM budgets WHERE deleted_at IS NULL AND category_id = ? AND currency = ?`,
        [input.category_id, input.currency],
      );

  const id = (keepsId && orig ? orig.id : null) ?? existing?.id ?? newId();

  d.withTransactionSync(() => {
    if (orig && !keepsId) d.runSync(`UPDATE budgets SET deleted_at = ? WHERE id = ?`, [now, orig.id]);
    if (existing || keepsId) {
      d.runSync(`UPDATE budgets SET amount_minor = ? WHERE id = ?`, [amount, id]);
    } else {
      d.runSync(
        `INSERT INTO budgets (id, category_id, currency, amount_minor, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, input.category_id, input.currency, amount, now],
      );
    }
  });

  return id;
}

/** Soft-delete; returns the timestamp that undo needs. */
export function deleteBudget(id: string): number {
  const at = Date.now();
  getDb().runSync(`UPDATE budgets SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`, [at, id]);
  return at;
}

export function restoreBudget(id: string, at: number): void {
  getDb().runSync(`UPDATE budgets SET deleted_at = NULL WHERE id = ? AND deleted_at = ?`, [id, at]);
}

// ---------------------------------------------------------------- recurring bills

const RECURRING_COLS = `r.id, r.name, r.type, r.amount_minor, r.currency, r.account_id, r.category_id, r.due_day, r.done_period, r.deleted_at, r.created_at`;

/** Every live bill, soonest due day first. */
export function listRecurring(): RecurringView[] {
  return getDb().getAllSync<RecurringView>(
    `SELECT ${RECURRING_COLS}, a.name AS account_name
     FROM recurring r
     LEFT JOIN accounts a ON a.id = r.account_id
     WHERE r.deleted_at IS NULL
     ORDER BY r.due_day, r.created_at`,
  );
}

/** Live bills whose day has arrived and that this month hasn't handled yet. */
export function listDueRecurring(day: number, period: string): RecurringView[] {
  return getDb().getAllSync<RecurringView>(
    `SELECT ${RECURRING_COLS}, a.name AS account_name
     FROM recurring r
     LEFT JOIN accounts a ON a.id = r.account_id
     WHERE r.deleted_at IS NULL AND r.due_day <= ? AND (r.done_period IS NULL OR r.done_period <> ?)
     ORDER BY r.due_day, r.created_at`,
    [day, period],
  );
}

export function saveRecurring(input: RecurringInput): string {
  const name = input.name.trim();
  const amount = Math.round(Math.abs(input.amount_minor));
  if (!name) throw new Error('Name the bill first');
  if (!(amount > 0)) throw new Error('Enter an amount first');
  if (!input.account_id) throw new Error('Pick a money place first');
  const day = Math.min(Math.max(Math.round(input.due_day) || 1, 1), 28);
  const d = getDb();
  if (input.id) {
    const live = d.getFirstSync<{ id: string }>(`SELECT id FROM recurring WHERE id = ? AND deleted_at IS NULL`, [input.id]);
    if (live) {
      d.runSync(
        `UPDATE recurring SET name = ?, type = ?, amount_minor = ?, currency = ?, account_id = ?, category_id = ?, due_day = ? WHERE id = ?`,
        [name, input.type, amount, input.currency, input.account_id, input.category_id, day, input.id],
      );
      return input.id;
    }
  }
  const id = newId();
  d.runSync(
    `INSERT INTO recurring (id, name, type, amount_minor, currency, account_id, category_id, due_day, done_period, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [id, name, input.type, amount, input.currency, input.account_id, input.category_id, day, Date.now()],
  );
  return id;
}

/**
 * Log the bill as a real entry and close the month — one transaction, so the
 * entry and the bookkeeping can never disagree. Returns what undo needs.
 */
export function logRecurring(id: string, period: string): { txId: string; previous: string | null } {
  const d = getDb();
  const bill = d.getFirstSync<RecurringRow>(`SELECT * FROM recurring WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!bill) throw new Error('That bill is gone');
  const txId = newId();
  const now = Date.now();
  d.withTransactionSync(() => {
    d.runSync(
      `INSERT INTO transactions (id, type, amount_minor, currency, account_id, to_account_id, category_id, contact_id, note, occurred_at, created_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, NULL)`,
      [txId, bill.type, bill.amount_minor, bill.currency, bill.account_id, bill.category_id, bill.name, now, now],
    );
    d.runSync(`UPDATE recurring SET done_period = ? WHERE id = ?`, [period, id]);
  });
  return { txId, previous: bill.done_period };
}

/** Undo a log: soft-delete the entry and reopen the month. */
export function undoLogRecurring(id: string, txId: string, previous: string | null): void {
  const d = getDb();
  d.withTransactionSync(() => {
    d.runSync(`UPDATE transactions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`, [Date.now(), txId]);
    d.runSync(`UPDATE recurring SET done_period = ? WHERE id = ?`, [previous, id]);
  });
}

/** Close the month without logging; returns the previous period for undo. */
export function skipRecurring(id: string, period: string): string | null {
  const d = getDb();
  const previous =
    d.getFirstSync<{ done_period: string | null }>(`SELECT done_period FROM recurring WHERE id = ? AND deleted_at IS NULL`, [id])
      ?.done_period ?? null;
  d.runSync(`UPDATE recurring SET done_period = ? WHERE id = ?`, [period, id]);
  return previous;
}

export function restoreRecurringPeriod(id: string, previous: string | null): void {
  getDb().runSync(`UPDATE recurring SET done_period = ? WHERE id = ?`, [previous, id]);
}

/** Soft-delete; returns the timestamp that undo needs. */
export function deleteRecurring(id: string): number {
  const at = Date.now();
  getDb().runSync(`UPDATE recurring SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`, [at, id]);
  return at;
}

export function restoreRecurring(id: string, at: number): void {
  getDb().runSync(`UPDATE recurring SET deleted_at = NULL WHERE id = ? AND deleted_at = ?`, [id, at]);
}

// ---------------------------------------------------------------- summary

/**
 * "Where is my money" — one block per currency, never converted or mixed.
 * Places come first (ordered by creation), each with its live balance.
 */
export function moneySummary(): CurrencySummary[] {
  const accounts = getDb().getAllSync<AccountWithBalance>(
    `SELECT ${ACCOUNT_COLS}, a.opening_minor + COALESCE(v.delta, 0) AS balance_minor
     FROM accounts a
     LEFT JOIN v_account_deltas v ON v.id = a.id
     WHERE a.deleted_at IS NULL AND a.archived_at IS NULL
     ORDER BY a.created_at, a.name COLLATE NOCASE`,
  );

  const contactSums = getDb().getAllSync<{ currency: string; lent: number; borrowed: number }>(
    `SELECT v.currency AS currency,
            SUM(CASE WHEN v.delta > 0 THEN v.delta ELSE 0 END)  AS lent,
            SUM(CASE WHEN v.delta < 0 THEN -v.delta ELSE 0 END) AS borrowed
     FROM v_contact_deltas v
     JOIN contacts c ON c.id = v.id
     WHERE c.deleted_at IS NULL
     GROUP BY v.currency`,
  );

  const byCurrency = new Map<string, CurrencySummary>();
  const ensure = (currency: string): CurrencySummary => {
    let entry = byCurrency.get(currency);
    if (!entry) {
      entry = { currency, inPlaces: 0, places: [], lent: 0, borrowed: 0 };
      byCurrency.set(currency, entry);
    }
    return entry;
  };

  for (const account of accounts) {
    const entry = ensure(account.currency);
    entry.places.push({ account, balance_minor: account.balance_minor });
    entry.inPlaces += account.balance_minor;
  }
  for (const sum of contactSums) {
    const entry = ensure(sum.currency);
    entry.lent += sum.lent;
    entry.borrowed += sum.borrowed;
  }

  return [...byCurrency.values()].filter((s) => s.places.length > 0 || s.lent > 0 || s.borrowed > 0);
}

/** Tiny counts for the data screen — one round trip. */
export function exportCounts(): { places: number; people: number; entries: number } {
  const d = getDb();
  return {
    places: d.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM accounts WHERE deleted_at IS NULL`)?.n ?? 0,
    people: d.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM contacts WHERE deleted_at IS NULL`)?.n ?? 0,
    entries: d.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM transactions WHERE deleted_at IS NULL`)?.n ?? 0,
  };
}

/** Total outstanding per currency, across all people. */
export function contactTotals(): ContactBalance[] {
  return getDb().getAllSync<ContactBalance>(
    `SELECT v.currency AS currency, SUM(v.delta) AS delta
     FROM v_contact_deltas v
     JOIN contacts c ON c.id = v.id
     WHERE c.deleted_at IS NULL
     GROUP BY v.currency
     HAVING SUM(v.delta) != 0`,
  );
}

// ---------------------------------------------------------------- reports

/**
 * Everything that happened in [from, to), one row per currency.
 * Transfers are absent on purpose — money inside your own places isn't a flow.
 */
export function reportTotals(from: number, to: number): ReportTotals[] {
  return getDb().getAllSync<ReportTotals>(
    `SELECT currency,
       SUM(CASE WHEN type = 'expense'   THEN amount_minor ELSE 0 END) AS spent,
       SUM(CASE WHEN type = 'income'    THEN amount_minor ELSE 0 END) AS income,
       SUM(CASE WHEN type = 'lend'      THEN amount_minor ELSE 0 END) AS lent,
       SUM(CASE WHEN type = 'borrow'    THEN amount_minor ELSE 0 END) AS borrowed,
       SUM(CASE WHEN type = 'repay_in'  THEN amount_minor ELSE 0 END) AS repaidIn,
       SUM(CASE WHEN type = 'repay_out' THEN amount_minor ELSE 0 END) AS repaidOut
     FROM transactions
     WHERE deleted_at IS NULL AND occurred_at >= ? AND occurred_at < ?
     GROUP BY currency`,
    [from, to],
  );
}

/** Category breakdown for one kind and period, biggest first. */
export function reportCategoryTotals(kind: CategoryKind, from: number, to: number): CategoryTotal[] {
  return getDb().getAllSync<CategoryTotal>(
    `SELECT t.currency AS currency,
            t.category_id AS category_id,
            c.name AS category,
            SUM(t.amount_minor) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL AND t.type = ? AND t.occurred_at >= ? AND t.occurred_at < ?
     GROUP BY t.currency, t.category_id
     ORDER BY total DESC`,
    [kind, from, to],
  );
}

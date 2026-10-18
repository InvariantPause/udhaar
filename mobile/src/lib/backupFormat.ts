/**
 * Backup format — pure functions only, no db or expo imports, so
 * scripts/db-check.mjs can exercise the whole thing under node type-stripping.
 *
 * Two formats are understood:
 * - 'udhaar-v1' — this app's own export: versioned header + raw table rows.
 * - 'legacy'    — the retired mobile.html prototype backup
 *                 (`udhaar-backup-*.json`: transactions + contacts[entries]).
 *
 * Import rule: nothing lands until describeBackup() has inspected the file
 * and the user has chosen replace or merge.
 */
import { SCHEMA_VERSION } from './db/schema.ts';
import { toMinor } from './money.ts';

export const BACKUP_APP = 'udhaar';
export const BACKUP_KIND = 'backup';

export interface BackupAccountRow {
  id: string;
  name: string;
  kind: string;
  currency: string;
  opening_minor: number;
  archived_at: number | null;
  deleted_at: number | null;
  created_at: number;
}

export interface BackupCategoryRow {
  id: string;
  name: string;
  kind: string;
  sort: number;
  deleted_at: number | null;
  created_at: number;
}

export interface BackupContactRow {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  deleted_at: number | null;
  created_at: number;
}

export interface BackupTxRow {
  id: string;
  type: string;
  amount_minor: number;
  currency: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  contact_id: string | null;
  note: string | null;
  occurred_at: number;
  created_at: number;
  deleted_at: number | null;
}

export interface BackupBudgetRow {
  id: string;
  category_id: string;
  currency: string;
  amount_minor: number;
  deleted_at: number | null;
  created_at: number;
}

export interface BackupRecurringRow {
  id: string;
  name: string;
  type: string;
  amount_minor: number;
  currency: string;
  account_id: string | null;
  category_id: string | null;
  due_day: number;
  done_period: string | null;
  deleted_at: number | null;
  created_at: number;
}

export interface BackupTables {
  accounts: BackupAccountRow[];
  categories: BackupCategoryRow[];
  contacts: BackupContactRow[];
  transactions: BackupTxRow[];
  budgets: BackupBudgetRow[];
  recurring: BackupRecurringRow[];
}

export interface BackupFile {
  app: string;
  kind: string;
  schemaVersion: number;
  exportedAt: number;
  note: string;
  tables: BackupTables;
}

export interface BackupCounts {
  accounts: number;
  categories: number;
  contacts: number;
  transactions: number;
  budgets: number;
  recurring: number;
  skippedSubscriptions: number;
  skippedBudgets: number;
}

export interface BackupDescription {
  ok: boolean;
  error?: string;
  format: 'udhaar-v1' | 'legacy' | null;
  counts: BackupCounts;
  currencies: string[];
  warnings: string[];
}

export function emptyCounts(): BackupCounts {
  return { accounts: 0, categories: 0, contacts: 0, transactions: 0, budgets: 0, recurring: 0, skippedSubscriptions: 0, skippedBudgets: 0 };
}

export function buildBackupPayload(tables: BackupTables, exportedAt: number, schemaVersion = SCHEMA_VERSION): BackupFile {
  return {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    schemaVersion,
    exportedAt,
    note: 'Amounts are integer minor units (paisa/cents). Ids are stable across import.',
    tables: {
      accounts: tables.accounts.map((r) => ({ ...r })),
      categories: tables.categories.map((r) => ({ ...r })),
      contacts: tables.contacts.map((r) => ({ ...r })),
      transactions: tables.transactions.map((r) => ({ ...r })),
      budgets: (tables.budgets ?? []).map((r) => ({ ...r })),
      recurring: (tables.recurring ?? []).map((r) => ({ ...r })),
    },
  };
}

// ---------------------------------------------------------------- describe

export function describeBackup(data: unknown): BackupDescription {
  const fail = (error: string): BackupDescription => ({
    ok: false,
    error,
    format: null,
    counts: emptyCounts(),
    currencies: [],
    warnings: [],
  });

  if (!isRecord(data)) return fail('That file is not an Udhaar backup');

  if (data.app === BACKUP_APP && data.kind === BACKUP_KIND) {
    const version = Number(data.schemaVersion);
    if (!Number.isFinite(version) || version < 1) return fail('This backup header is damaged');
    if (version > SCHEMA_VERSION) {
      return fail(`This backup is from a newer version of the app. Update the app first.`);
    }
    const { tables, warnings } = normalizeNewTables(data.tables);
    return {
      ok: true,
      format: 'udhaar-v1',
      counts: {
        ...emptyCounts(),
        accounts: tables.accounts.length,
        categories: tables.categories.length,
        contacts: tables.contacts.length,
        transactions: tables.transactions.length,
        budgets: tables.budgets.length,
        recurring: tables.recurring.length,
      },
      currencies: currenciesOf(tables),
      warnings,
    };
  }

  if (Array.isArray(data.contacts) && Array.isArray(data.transactions)) {
    const { tables, warnings } = legacyToRows(data, () => 'describe', Date.now());
    const subscriptions = asArray(data.subscriptions).length;
    const budgets = asArray(data.budgets).length;
    if (subscriptions > 0) warnings.push(`${subscriptions} subscriptions from the old app are skipped (not supported yet)`);
    if (budgets > 0) warnings.push(`${budgets} budgets from the old app are skipped (not supported yet)`);
    return {
      ok: true,
      format: 'legacy',
      counts: {
        ...emptyCounts(),
        accounts: tables.accounts.length,
        categories: tables.categories.length,
        contacts: tables.contacts.length,
        transactions: tables.transactions.length,
        skippedSubscriptions: subscriptions,
        skippedBudgets: budgets,
      },
      currencies: currenciesOf(tables),
      warnings,
    };
  }

  return fail('That file is not an Udhaar backup');
}

// ---------------------------------------------------------------- new format

const ACCOUNT_KINDS = ['cash', 'bank', 'wallet', 'other'];
const CATEGORY_KINDS = ['expense', 'income'];
const TX_TYPES = ['expense', 'income', 'transfer', 'lend', 'borrow', 'repay_in', 'repay_out'];

/** Coerce rows to the exact schema shape; drop only what can't be repaired. */
export function normalizeNewTables(raw: unknown): { tables: BackupTables; warnings: string[] } {
  const src = isRecord(raw) ? raw : {};
  const warnings: string[] = [];

  const accounts: BackupAccountRow[] = [];
  let bad = 0;
  for (const r of records(src.accounts)) {
    const id = str(r.id);
    const name = str(r.name);
    if (!id || !name) {
      bad++;
      continue;
    }
    accounts.push({
      id,
      name,
      kind: ACCOUNT_KINDS.includes(str(r.kind)) ? str(r.kind) : 'other',
      currency: str(r.currency) || 'PKR',
      opening_minor: int(r.opening_minor, 0),
      archived_at: nullableInt(r.archived_at),
      deleted_at: nullableInt(r.deleted_at),
      created_at: int(r.created_at, 0),
    });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged place rows`);

  const categories: BackupCategoryRow[] = [];
  bad = 0;
  for (const r of records(src.categories)) {
    const id = str(r.id);
    const name = str(r.name);
    const kind = str(r.kind);
    if (!id || !name || !CATEGORY_KINDS.includes(kind)) {
      bad++;
      continue;
    }
    categories.push({ id, name, kind, sort: int(r.sort, 0), deleted_at: nullableInt(r.deleted_at), created_at: int(r.created_at, 0) });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged category rows`);

  const contacts: BackupContactRow[] = [];
  bad = 0;
  for (const r of records(src.contacts)) {
    const id = str(r.id);
    const name = str(r.name);
    if (!id || !name) {
      bad++;
      continue;
    }
    contacts.push({ id, name, phone: nullableStr(r.phone), note: nullableStr(r.note), deleted_at: nullableInt(r.deleted_at), created_at: int(r.created_at, 0) });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged person rows`);

  const transactions: BackupTxRow[] = [];
  bad = 0;
  for (const r of records(src.transactions)) {
    const id = str(r.id);
    const type = str(r.type);
    const amount = int(r.amount_minor, 0);
    if (!id || !TX_TYPES.includes(type) || !(amount > 0)) {
      bad++;
      continue;
    }
    transactions.push({
      id,
      type,
      amount_minor: amount,
      currency: str(r.currency) || 'PKR',
      account_id: nullableStr(r.account_id),
      to_account_id: nullableStr(r.to_account_id),
      category_id: nullableStr(r.category_id),
      contact_id: nullableStr(r.contact_id),
      note: nullableStr(r.note),
      occurred_at: int(r.occurred_at, 0),
      created_at: int(r.created_at, 0),
      deleted_at: nullableInt(r.deleted_at),
    });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged entry rows`);

  const budgets: BackupBudgetRow[] = [];
  bad = 0;
  for (const r of records(src.budgets)) {
    const id = str(r.id);
    const categoryId = str(r.category_id);
    const amount = int(r.amount_minor, 0);
    if (!id || !categoryId || !(amount > 0)) {
      bad++;
      continue;
    }
    budgets.push({
      id,
      category_id: categoryId,
      currency: str(r.currency) || 'PKR',
      amount_minor: amount,
      deleted_at: nullableInt(r.deleted_at),
      created_at: int(r.created_at, 0),
    });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged budget rows`);

  const recurring: BackupRecurringRow[] = [];
  bad = 0;
  for (const r of records(src.recurring)) {
    const id = str(r.id);
    const name = str(r.name);
    const type = str(r.type);
    const amount = int(r.amount_minor, 0);
    if (!id || !name || !(type === 'expense' || type === 'income') || !(amount > 0)) {
      bad++;
      continue;
    }
    recurring.push({
      id,
      name,
      type,
      amount_minor: amount,
      currency: str(r.currency) || 'PKR',
      account_id: nullableStr(r.account_id),
      category_id: nullableStr(r.category_id),
      due_day: Math.min(Math.max(int(r.due_day, 1), 1), 28),
      done_period: nullableStr(r.done_period),
      deleted_at: nullableInt(r.deleted_at),
      created_at: int(r.created_at, 0),
    });
  }
  if (bad) warnings.push(`Skipped ${bad} damaged bill rows`);

  return { tables: { accounts, categories, contacts, transactions, budgets, recurring }, warnings };
}

// ---------------------------------------------------------------- legacy format

function accountKindFor(method: string): string {
  const m = method.toLowerCase();
  if (m.includes('jazz') || m.includes('easypaisa') || m.includes('wallet')) return 'wallet';
  if (m.includes('bank') || m.includes('raast') || m.includes('card') || m.includes('transfer')) return 'bank';
  if (m.includes('cash')) return 'cash';
  return 'other';
}

function legacyDay(value: unknown, fallback: number): number {
  const s = str(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return fallback;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function legacyCreated(value: unknown, fallback: number): number {
  const t = typeof value === 'number' ? value : Date.parse(str(value));
  return Number.isFinite(t) && t > 0 ? t : fallback;
}

/**
 * Map a prototype backup to current rows.
 * - expense/income keep their category by name (created if missing)
 * - `method` becomes a money place (Cash / JazzCash / Bank Transfer…); a new
 *   place is created per method+currency the moment it's needed
 * - contact entries become lend/borrow/repay_in/repay_out with the contact linked
 * - subscriptions & budgets are reported as skipped, never silently dropped
 */
export function legacyToRows(
  data: Record<string, unknown>,
  idFactory: () => string,
  fallbackNow: number,
): { tables: BackupTables; warnings: string[] } {
  const warnings: string[] = [];
  const accounts: BackupAccountRow[] = [];
  const categories: BackupCategoryRow[] = [];
  const contacts: BackupContactRow[] = [];
  const transactions: BackupTxRow[] = [];

  const accountByKey = new Map<string, string>();
  const categoryByKey = new Map<string, string>();
  let skipped = 0;

  const ensureAccount = (methodRaw: unknown, currency: string, hintTs: number): string => {
    const method = str(methodRaw) || 'Cash';
    const key = `${method.toLowerCase()}::${currency}`;
    const found = accountByKey.get(key);
    if (found) return found;
    const id = idFactory();
    accounts.push({
      id,
      name: method,
      kind: accountKindFor(method),
      currency,
      opening_minor: 0,
      archived_at: null,
      deleted_at: null,
      created_at: hintTs,
    });
    accountByKey.set(key, id);
    return id;
  };

  const ensureCategory = (kind: string, nameRaw: unknown): string | null => {
    const name = str(nameRaw);
    if (!name) return null;
    const key = `${kind}::${name.toLowerCase()}`;
    const found = categoryByKey.get(key);
    if (found) return found;
    const id = idFactory();
    categories.push({ id, name, kind, sort: 100 + categories.length, deleted_at: null, created_at: fallbackNow });
    categoryByKey.set(key, id);
    return id;
  };

  // Legacy category names first — the user's own vocabulary is kept.
  const catBlock = isRecord(data.categories) ? data.categories : {};
  for (const kind of CATEGORY_KINDS) {
    for (const name of asArray(catBlock[kind])) ensureCategory(kind, name);
  }

  const settings = isRecord(data.settings) ? data.settings : {};
  const defaultMethod = str(settings.method);

  for (const t of records(data.transactions)) {
    const type = str(t.type) === 'income' ? 'income' : 'expense';
    const amount = num(t.amount);
    if (!(amount > 0)) {
      skipped++;
      continue;
    }
    const currency = str(t.currency) || str(settings.currency) || 'PKR';
    const occurred = legacyDay(t.date, fallbackNow);
    transactions.push({
      id: idFactory(),
      type,
      amount_minor: toMinor(amount, currency),
      currency,
      account_id: ensureAccount(t.method ?? defaultMethod, currency, occurred),
      to_account_id: null,
      category_id: ensureCategory(type, t.category),
      contact_id: null,
      note: str(t.note) || null,
      occurred_at: occurred,
      created_at: legacyCreated(t.created, occurred),
      deleted_at: null,
    });
  }

  const KIND_TO_TYPE: Record<string, string> = { lent: 'lend', borrowed: 'borrow', received: 'repay_in', paid: 'repay_out' };

  for (const c of records(data.contacts)) {
    const name = str(c.name);
    if (!name) {
      skipped++;
      continue;
    }
    const contactId = idFactory();
    contacts.push({
      id: contactId,
      name,
      phone: str(c.phone) || null,
      note: null,
      deleted_at: null,
      created_at: legacyCreated(c.created, fallbackNow),
    });
    for (const e of records(c.entries)) {
      const type = KIND_TO_TYPE[str(e.kind)];
      const amount = Math.abs(num(e.amount));
      if (!type || !(amount > 0)) {
        skipped++;
        continue;
      }
      const currency = str(e.currency) || str(settings.currency) || 'PKR';
      const occurred = legacyDay(e.date, fallbackNow);
      transactions.push({
        id: idFactory(),
        type,
        amount_minor: toMinor(amount, currency),
        currency,
        account_id: ensureAccount(defaultMethod || 'Cash', currency, occurred),
        to_account_id: null,
        category_id: null,
        contact_id: contactId,
        note: str(e.note) || null,
        occurred_at: occurred,
        created_at: legacyCreated(e.date, occurred),
        deleted_at: null,
      });
    }
  }

  if (skipped > 0) warnings.push(`Skipped ${skipped} damaged rows from the old backup`);

  return { tables: { accounts, categories, contacts, transactions, budgets: [], recurring: [] }, warnings };
}

// ---------------------------------------------------------------- helpers

function currenciesOf(tables: BackupTables): string[] {
  const set = new Set<string>();
  for (const a of tables.accounts) set.add(a.currency);
  for (const t of tables.transactions) set.add(t.currency);
  return [...set].sort();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function records(v: unknown): Record<string, unknown>[] {
  return asArray(v).filter(isRecord);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function int(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function nullableInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function nullableStr(v: unknown): string | null {
  const s = str(v);
  return s || null;
}

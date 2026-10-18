import { describeBackup, legacyToRows, normalizeNewTables, buildBackupPayload, emptyCounts, type BackupDescription, type BackupTables } from './backupFormat';
import { SCHEMA_VERSION } from './db/schema';
import { getDb, newId } from './db/db';

/**
 * Backup I/O — the thin db layer over the pure format module.
 * Export dumps every table to a versioned JSON file; import is two-phase:
 * describe (dry-run) then runImport(mode) with the user's replace/merge choice.
 */

export function exportBackupJson(): { fileName: string; json: string } {
  const d = getDb();
  const tables: BackupTables = {
    accounts: d.getAllSync(`SELECT * FROM accounts ORDER BY created_at`),
    categories: d.getAllSync(`SELECT * FROM categories ORDER BY kind, sort`),
    contacts: d.getAllSync(`SELECT * FROM contacts ORDER BY created_at`),
    transactions: d.getAllSync(`SELECT * FROM transactions ORDER BY occurred_at, created_at`),
    budgets: d.getAllSync(`SELECT * FROM budgets ORDER BY created_at`),
    recurring: d.getAllSync(`SELECT * FROM recurring ORDER BY created_at`),
  };
  const payload = buildBackupPayload(tables, Date.now(), SCHEMA_VERSION);
  const date = new Date().toISOString().slice(0, 10);
  return { fileName: `udhaar-backup-${date}.json`, json: JSON.stringify(payload, null, 2) };
}

export function describeBackupText(json: string): BackupDescription {
  try {
    return describeBackup(JSON.parse(json));
  } catch {
    return { ok: false, error: 'That file is not valid JSON', format: null, counts: emptyCounts(), currencies: [], warnings: [] };
  }
}

export interface ImportResult {
  inserted: number;
  format: 'udhaar-v1' | 'legacy';
  mode: 'replace' | 'merge';
}

/**
 * Apply a validated backup. Merge keeps existing rows (stable ids are never
 * regenerated; same id = same row, so re-importing is idempotent). Replace
 * clears the data tables — budgets included — in one transaction first; a
 * v1 file simply carries no budgets, so a replace from one leaves none.
 */
export function runImport(json: string, mode: 'replace' | 'merge'): ImportResult {
  const parsed: unknown = JSON.parse(json);
  const desc = describeBackup(parsed);
  if (!desc.ok || !desc.format) throw new Error(desc.error ?? 'Invalid backup');

  const { tables } =
    desc.format === 'legacy'
      ? legacyToRows(parsed as Record<string, unknown>, newId, Date.now())
      : normalizeNewTables((parsed as { tables?: unknown }).tables);

  const d = getDb();
  let inserted = 0;
  const add = (changes: number) => {
    inserted += changes;
  };

  d.withTransactionSync(() => {
    if (mode === 'replace') {
      d.execSync(`DELETE FROM transactions; DELETE FROM contacts; DELETE FROM categories; DELETE FROM accounts; DELETE FROM budgets; DELETE FROM recurring;`);
    }
    for (const a of tables.accounts) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO accounts (id, name, kind, currency, opening_minor, archived_at, deleted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.name, a.kind, a.currency, a.opening_minor, a.archived_at, a.deleted_at, a.created_at],
        ).changes,
      );
    }
    for (const c of tables.categories) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO categories (id, name, kind, sort, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.kind, c.sort, c.deleted_at, c.created_at],
        ).changes,
      );
    }
    for (const c of tables.contacts) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO contacts (id, name, phone, note, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.phone, c.note, c.deleted_at, c.created_at],
        ).changes,
      );
    }
    for (const t of tables.transactions) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO transactions (id, type, amount_minor, currency, account_id, to_account_id, category_id, contact_id, note, occurred_at, created_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, t.type, t.amount_minor, t.currency, t.account_id, t.to_account_id, t.category_id, t.contact_id, t.note, t.occurred_at, t.created_at, t.deleted_at],
        ).changes,
      );
    }
    for (const b of tables.budgets ?? []) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO budgets (id, category_id, currency, amount_minor, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [b.id, b.category_id, b.currency, b.amount_minor, b.deleted_at, b.created_at],
        ).changes,
      );
    }
    for (const r of tables.recurring ?? []) {
      add(
        d.runSync(
          `INSERT OR IGNORE INTO recurring (id, name, type, amount_minor, currency, account_id, category_id, due_day, done_period, deleted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.type, r.amount_minor, r.currency, r.account_id, r.category_id, r.due_day, r.done_period, r.deleted_at, r.created_at],
        ).changes,
      );
    }
  });

  return { inserted, format: desc.format, mode };
}

/**
 * Schema — tables, views, seeds. Pure SQL strings only.
 * Migrations are append-only numbered arrays (index = user_version − 1),
 * each carrying its own rollback note.
 *
 * This file deliberately has ZERO runtime imports so that scripts/db-check.mjs
 * can import it under `node --experimental-strip-types` and replay the exact
 * same schema against node:sqlite.
 *
 * Invariants (do not break without a migration):
 * - Money is integer minor units (INTEGER columns), never REAL.
 * - Amounts are stored positive; the tx `type` carries the sign.
 * - Account & person balances are NEVER stored — they are derived by the
 *   views below. An edit or delete can therefore never desync a balance.
 * - No foreign keys: links are soft and a dangling id renders as
 *   "Removed place / person" instead of crashing.
 * - Nothing is hard-deleted. `deleted_at` (and `archived_at` for used
 *   places) are nullable timestamps — the only "deleted" flags allowed.
 */

export const SCHEMA_VERSION = 3;

/** Migration n (index n-1) runs in order against `PRAGMA user_version`. */
export const MIGRATIONS: string[][] = [
  [
    // ---- v1: the whole core schema -------------------------------------------------
    // Rollback note: v1 is the initial schema; the dev-only rollback is
    // "DROP VIEW v_contact_deltas; DROP VIEW v_account_deltas; DROP TABLE transactions;
    //  DROP TABLE contacts; DROP TABLE categories; DROP TABLE accounts; DROP TABLE meta;"
    // plus PRAGMA user_version = 0. Never ship a rollback that drops user rows.
    `
    CREATE TABLE meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE accounts (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      kind          TEXT NOT NULL CHECK (kind IN ('cash','bank','wallet','other')),
      currency      TEXT NOT NULL,
      opening_minor INTEGER NOT NULL DEFAULT 0,
      archived_at   INTEGER,
      deleted_at    INTEGER,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      kind       TEXT NOT NULL CHECK (kind IN ('expense','income')),
      sort       INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE contacts (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT,
      note       TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE transactions (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL CHECK (type IN ('expense','income','transfer','lend','borrow','repay_in','repay_out')),
      amount_minor  INTEGER NOT NULL CHECK (amount_minor > 0),
      currency      TEXT NOT NULL,
      account_id    TEXT,
      to_account_id TEXT,
      category_id   TEXT,
      contact_id    TEXT,
      note          TEXT,
      occurred_at   INTEGER NOT NULL,
      created_at    INTEGER NOT NULL,
      deleted_at    INTEGER
    );

    CREATE INDEX idx_tx_occurred   ON transactions (occurred_at DESC) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tx_contact    ON transactions (contact_id)       WHERE deleted_at IS NULL;
    CREATE INDEX idx_tx_account    ON transactions (account_id)       WHERE deleted_at IS NULL;
    CREATE INDEX idx_tx_to_account ON transactions (to_account_id)    WHERE deleted_at IS NULL;
    CREATE INDEX idx_contacts_name ON contacts (name COLLATE NOCASE);
    `,
    `
    -- Money into a place: income, borrow, repay_in, and the destination of a transfer.
    -- Money out: everything else (expense, lend, repay_out, transfer source).
    CREATE VIEW v_account_deltas AS
    SELECT id, currency, SUM(delta) AS delta FROM (
      SELECT account_id AS id, currency,
        CASE WHEN type IN ('income','borrow','repay_in') THEN amount_minor ELSE -amount_minor END AS delta
      FROM transactions
      WHERE deleted_at IS NULL AND account_id IS NOT NULL
      UNION ALL
      SELECT to_account_id AS id, currency, amount_minor AS delta
      FROM transactions
      WHERE deleted_at IS NULL AND type = 'transfer' AND to_account_id IS NOT NULL
    )
    GROUP BY id, currency;

    -- Person balance: positive = they owe you. lend & repay_out raise it,
    -- borrow & repay_in lower it.
    CREATE VIEW v_contact_deltas AS
    SELECT id, currency, SUM(delta) AS delta FROM (
      SELECT contact_id AS id, currency,
        CASE WHEN type IN ('lend','repay_out') THEN amount_minor ELSE -amount_minor END AS delta
      FROM transactions
      WHERE deleted_at IS NULL AND contact_id IS NOT NULL
    )
    GROUP BY id, currency;
    `,
  ],
  [
    // ---- v2: monthly budgets ------------------------------------------------
    // Rollback note: dev-only rollback is
    // "DROP INDEX idx_budgets_cat_cur; DROP TABLE budgets;" plus
    // PRAGMA user_version = 1. Never ship a rollback that drops user rows.
    `
    CREATE TABLE budgets (
      id           TEXT PRIMARY KEY,
      category_id  TEXT NOT NULL,
      currency     TEXT NOT NULL,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      deleted_at   INTEGER,
      created_at   INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX idx_budgets_cat_cur
      ON budgets (category_id, currency) WHERE deleted_at IS NULL;
    `,
  ],
  [
    // ---- v3: recurring bills -----------------------------------------------
    // Rollback note: dev-only rollback is "DROP TABLE recurring;" plus
    // PRAGMA user_version = 2. Never ship a rollback that drops user rows.
    `
    CREATE TABLE recurring (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency     TEXT NOT NULL,
      account_id   TEXT,
      category_id  TEXT,
      due_day      INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
      done_period  TEXT,
      deleted_at   INTEGER,
      created_at   INTEGER NOT NULL
    );
    `,
  ],
];

/**
 * First-run seed: two places to hold money and Indian-flavored categories.
 * Ids are stable strings (never reused, never regenerated) so scripts and
 * future migrations can refer to them. `INSERT OR IGNORE` keeps re-runs safe:
 * a seed row the user deleted stays deleted.
 */
export function seedStatements(now: number): string[] {
  const stmts: string[] = [];

  const accounts: [string, string, string, string][] = [
    ['acc-cash', 'Cash', 'cash', 'PKR'],
    ['acc-bank', 'Bank', 'bank', 'PKR'],
  ];
  for (const [id, name, kind, currency] of accounts) {
    stmts.push(
      `INSERT OR IGNORE INTO accounts (id, name, kind, currency, opening_minor, created_at)
       VALUES ('${id}', '${name}', '${kind}', '${currency}', 0, ${now});`,
    );
  }

  const categories: [string, string, string, number][] = [
    ['cat-kiryana', 'Kiryana', 'expense', 1],
    ['cat-food', 'Chai / Food', 'expense', 2],
    ['cat-petrol', 'Petrol / CNG', 'expense', 3],
    ['cat-aata', 'Aata', 'expense', 4],
    ['cat-mobile', 'Mobile Load', 'expense', 5],
    ['cat-wifi', 'Wifi', 'expense', 6],
    ['cat-bills', 'Bills', 'expense', 7],
    ['cat-health', 'Health', 'expense', 8],
    ['cat-study', 'Study', 'expense', 9],
    ['cat-eidi', 'Eidi / Gift', 'expense', 10],
    ['cat-other', 'Other', 'expense', 11],
    ['inc-salary', 'Salary', 'income', 1],
    ['inc-business', 'Business', 'income', 2],
    ['inc-freelance', 'Freelance', 'income', 3],
    ['inc-gift', 'Gift', 'income', 4],
    ['inc-other', 'Other', 'income', 5],
  ];
  for (const [id, name, kind, sort] of categories) {
    stmts.push(
      `INSERT OR IGNORE INTO categories (id, name, kind, sort, created_at)
       VALUES ('${id}', '${name}', '${kind}', ${sort}, ${now});`,
    );
  }

  // Fast-capture defaults: the first account is pre-selected until the user saves elsewhere.
  stmts.push(`INSERT OR IGNORE INTO meta (key, value) VALUES ('seeded', '1');`);
  stmts.push(`INSERT OR IGNORE INTO meta (key, value) VALUES ('last_account_id', 'acc-cash');`);

  return stmts;
}

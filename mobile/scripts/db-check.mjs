/**
 * db-check — replays the app's real schema (imported from schema.ts) against
 * node:sqlite and asserts the money invariants end to end:
 *
 *   expense/income/transfer move place balances,
 *   lend raises what a person owes, borrow lowers it,
 *   repay_in/repay_out actually settle the udhaar,
 *   soft-delete + undo + contact-cascade all leave balances correct.
 *
 * Run: node scripts/db-check.mjs   (from mobile/)
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS, SCHEMA_VERSION, seedStatements } from '../src/lib/db/schema.ts';
import { buildBackupPayload, describeBackup, legacyToRows, normalizeNewTables } from '../src/lib/backupFormat.ts';

const db = new DatabaseSync(':memory:');

// ---- migrate exactly like src/lib/db/db.ts ----------------------------------
for (let v = 0; v < MIGRATIONS.length; v++) {
  db.exec('BEGIN');
  for (const sql of MIGRATIONS[v]) db.exec(sql);
  db.exec(`PRAGMA user_version = ${v + 1}`);
  db.exec('COMMIT');
}
const version = db.prepare('PRAGMA user_version').get().user_version;
assert.equal(version, MIGRATIONS.length, 'user_version matches migration count');
assert.equal(SCHEMA_VERSION, MIGRATIONS.length, 'SCHEMA_VERSION matches migration count');

// ---- seed ---------------------------------------------------------------------
db.exec('BEGIN');
for (const sql of seedStatements(1000)) db.exec(sql);
db.exec('COMMIT');

const run = (sql, ...params) => db.prepare(sql).run(...params);
const one = (sql, ...params) => db.prepare(sql).get(...params);

run(`UPDATE accounts SET opening_minor = 1000000 WHERE id = 'acc-cash'`);
run(`UPDATE accounts SET opening_minor = 500000  WHERE id = 'acc-bank'`);

run(`INSERT INTO contacts (id, name, created_at) VALUES ('ali', 'Ali', 1000)`);
run(`INSERT INTO contacts (id, name, created_at) VALUES ('bilal', 'Bilal', 1000)`);

let txSeq = 0;
const tx = (type, amount, { account = null, to = null, contact = null, id = `tx-${++txSeq}` } = {}) => {
  run(
    `INSERT INTO transactions (id, type, amount_minor, currency, account_id, to_account_id, contact_id, occurred_at, created_at)
     VALUES (?, ?, ?, 'PKR', ?, ?, ?, 2000, 2000)`,
    id,
    type,
    amount,
    account,
    to,
    contact,
  );
  return id;
};

const balance = (id) =>
  one(
    `SELECT a.opening_minor + COALESCE(v.delta, 0) AS b
     FROM accounts a LEFT JOIN v_account_deltas v ON v.id = a.id
     WHERE a.id = ?`,
    id,
  ).b;

const delta = (contactId) =>
  one(`SELECT COALESCE(SUM(delta), 0) AS d FROM v_contact_deltas WHERE id = ?`, contactId).d;

const totals = () =>
  one(
    `SELECT
       COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)  AS lent,
       COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0) AS borrowed
     FROM v_contact_deltas v
     JOIN contacts c ON c.id = v.id
     WHERE c.deleted_at IS NULL`,
  );

const step = (name, fn) => {
  fn();
  console.log(`  ok  ${name}`);
};

console.log(`db-check · schema v${version} · ${MIGRATIONS.length} migration(s)`);

step('seed: opening balances', () => {
  assert.equal(balance('acc-cash'), 1000000);
  assert.equal(balance('acc-bank'), 500000);
  assert.equal(delta('ali'), 0);
});

step('expense 82,000 from cash → cash 918,000', () => {
  tx('expense', 82000, { account: 'acc-cash' });
  assert.equal(balance('acc-cash'), 918000);
});

step('income 850,000 to bank → bank 1,350,000', () => {
  tx('income', 850000, { account: 'acc-bank' });
  assert.equal(balance('acc-bank'), 1350000);
});

step('transfer 100,000 cash → bank', () => {
  tx('transfer', 100000, { account: 'acc-cash', to: 'acc-bank' });
  assert.equal(balance('acc-cash'), 818000);
  assert.equal(balance('acc-bank'), 1450000);
});

step('lend 500,000 from cash → cash down, Ali owes', () => {
  tx('lend', 500000, { account: 'acc-cash', contact: 'ali' });
  assert.equal(balance('acc-cash'), 318000);
  assert.equal(delta('ali'), 500000);
});

step('Ali repays 200,000 into bank → Ali owes less, bank up', () => {
  tx('repay_in', 200000, { account: 'acc-bank', contact: 'ali' });
  assert.equal(balance('acc-bank'), 1650000);
  assert.equal(delta('ali'), 300000);
});

step('borrow 120,000 into bank from Bilal → bank up, we owe Bilal', () => {
  tx('borrow', 120000, { account: 'acc-bank', contact: 'bilal' });
  assert.equal(balance('acc-bank'), 1770000);
  assert.equal(delta('bilal'), -120000);
});

step('pay Bilal 50,000 from cash → we owe less', () => {
  tx('repay_out', 50000, { account: 'acc-cash', contact: 'bilal' });
  assert.equal(balance('acc-cash'), 268000);
  assert.equal(delta('bilal'), -70000);
});

step('summary: lent 300,000 · borrowed 70,000 (per currency, never mixed)', () => {
  const t = totals();
  assert.equal(t.lent, 300000);
  assert.equal(t.borrowed, 70000);
});

step('soft-delete the lend → cash restored, Ali overpaid', () => {
  run(`UPDATE transactions SET deleted_at = 3000 WHERE type = 'lend' AND deleted_at IS NULL`);
  assert.equal(balance('acc-cash'), 768000);
  assert.equal(delta('ali'), -200000);
  const t = totals();
  assert.equal(t.lent, 0);
  assert.equal(t.borrowed, 270000);
});

step('undo the delete → everything back', () => {
  run(`UPDATE transactions SET deleted_at = NULL WHERE deleted_at = 3000`);
  assert.equal(balance('acc-cash'), 268000);
  assert.equal(delta('ali'), 300000);
});

step('delete Ali with cascade → his money movements vanish', () => {
  run(`UPDATE contacts SET deleted_at = 4000 WHERE id = 'ali'`);
  run(`UPDATE transactions SET deleted_at = 4000 WHERE contact_id = 'ali' AND deleted_at IS NULL`);
  assert.equal(balance('acc-bank'), 1570000); // repay_in gone (bank was 1,770,000 incl. Bilal's borrow)
  assert.equal(balance('acc-cash'), 768000); // lend gone
  assert.equal(delta('ali'), 0); // even the raw view only counts live rows
});

step('undo the cascade → person and ledger return', () => {
  run(`UPDATE contacts SET deleted_at = NULL WHERE id = 'ali' AND deleted_at = 4000`);
  run(`UPDATE transactions SET deleted_at = NULL WHERE contact_id = 'ali' AND deleted_at = 4000`);
  assert.equal(balance('acc-bank'), 1770000);
  assert.equal(balance('acc-cash'), 268000);
  assert.equal(delta('ali'), 300000);
});

step('reports: spent vs lent kept separate (final state)', () => {
  const r = one(
    `SELECT
       SUM(CASE WHEN type = 'expense'   THEN amount_minor ELSE 0 END) AS spent,
       SUM(CASE WHEN type = 'income'    THEN amount_minor ELSE 0 END) AS income,
       SUM(CASE WHEN type = 'lend'      THEN amount_minor ELSE 0 END) AS lent,
       SUM(CASE WHEN type = 'borrow'    THEN amount_minor ELSE 0 END) AS borrowed,
       SUM(CASE WHEN type = 'repay_in'  THEN amount_minor ELSE 0 END) AS repaidIn,
       SUM(CASE WHEN type = 'repay_out' THEN amount_minor ELSE 0 END) AS repaidOut
     FROM transactions
     WHERE deleted_at IS NULL AND occurred_at >= 0 AND occurred_at < 999999`,
  );
  assert.equal(r.spent, 82000);
  assert.equal(r.income, 850000);
  assert.equal(r.lent, 500000);
  assert.equal(r.borrowed, 120000);
  assert.equal(r.repaidIn, 200000);
  assert.equal(r.repaidOut, 50000);
});

step('reports: net flow equals the places\' actual movement', () => {
  const moneyIn = 850000 + 120000 + 200000;
  const moneyOut = 82000 + 500000 + 50000;
  const netMovement = balance('acc-cash') - 1000000 + (balance('acc-bank') - 500000);
  assert.equal(moneyIn - moneyOut, netMovement); // transfers cancel out inside
});

step('reports: period filter respects occurred_at', () => {
  const r = one(
    `SELECT COUNT(*) AS n FROM transactions WHERE deleted_at IS NULL AND occurred_at >= 5000 AND occurred_at < 999999`,
  );
  assert.equal(r.n, 0); // every row sits at 2000 in this scenario
});

step('amounts must be positive (CHECK constraint holds)', () => {
  assert.throws(() =>
    run(
      `INSERT INTO transactions (id, type, amount_minor, currency, occurred_at, created_at)
       VALUES ('bad', 'expense', -1, 'PKR', 2000, 2000)`,
    ),
  );
});

// ---------------------------------------------------------------- backup format

const legacyBackup = {
  transactions: [
    { id: 'lt1', type: 'expense', amount: '1200.5', currency: 'PKR', category: 'Kiryana / Grocery', date: '2026-10-01', method: 'Cash', note: 'weekly', created: '2026-10-01T09:00:00.000Z' },
    { id: 'lt2', type: 'income', amount: 85000, currency: 'PKR', category: 'Salary', date: '2026-10-05', method: 'Bank Transfer', created: '2026-10-05T09:00:00.000Z' },
  ],
  contacts: [
    {
      id: 'lc1',
      name: 'Ahmed Bhai',
      phone: '+92 300 1234567',
      created: '2026-01-01',
      entries: [
        { id: 'le1', kind: 'lent', amount: 5000, currency: 'PKR', date: '2026-09-20', note: 'bike repair' },
        { id: 'le2', kind: 'received', amount: 2000, currency: 'PKR', date: '2026-10-06' },
      ],
    },
  ],
  categories: { expense: ['Kiryana / Grocery'], income: ['Salary'] },
  subscriptions: [{ name: 'Netflix' }],
  budgets: [{ category: 'Chai / Food' }],
  settings: { currency: 'PKR', method: 'Cash' },
};

step('backup: describe sees the legacy prototype file', () => {
  const desc = describeBackup(legacyBackup);
  assert.equal(desc.ok, true);
  assert.equal(desc.format, 'legacy');
  assert.equal(desc.counts.transactions, 4); // 2 spending rows + 2 udhaar entries
  assert.equal(desc.counts.contacts, 1);
  assert.equal(desc.counts.accounts, 2); // Cash + Bank Transfer
  assert.equal(desc.counts.skippedSubscriptions, 1);
  assert.equal(desc.counts.skippedBudgets, 1);
  assert.deepEqual(desc.currencies, ['PKR']);
});

step('budgets: one live cap per category+currency, soft delete frees the slot', () => {
  run(`INSERT INTO budgets (id, category_id, currency, amount_minor, created_at) VALUES ('bud-1', 'cat-kiryana', 'PKR', 1500000, 7000)`);
  assert.throws(() =>
    run(`INSERT INTO budgets (id, category_id, currency, amount_minor, created_at) VALUES ('bud-2', 'cat-kiryana', 'PKR', 2000000, 7000)`),
  );
  run(`UPDATE budgets SET deleted_at = 8000 WHERE id = 'bud-1'`);
  run(`INSERT INTO budgets (id, category_id, currency, amount_minor, created_at) VALUES ('bud-3', 'cat-kiryana', 'PKR', 2000000, 7000)`);
  assert.equal(one(`SELECT COUNT(*) AS n FROM budgets WHERE deleted_at IS NULL`).n, 1);
});

step('budgets: spent counts live expenses in the period only', () => {
  run(`INSERT INTO transactions (id, type, amount_minor, currency, account_id, category_id, occurred_at, created_at) VALUES ('tx-bud', 'expense', 30000, 'PKR', 'acc-cash', 'cat-kiryana', 2500, 2500)`);
  const spent = one(
    `SELECT COALESCE((
       SELECT SUM(t.amount_minor) FROM transactions t
       WHERE t.deleted_at IS NULL AND t.type = 'expense'
         AND t.category_id = b.category_id AND t.currency = b.currency
         AND t.occurred_at >= 0 AND t.occurred_at < 5000
     ), 0) AS spent
     FROM budgets b WHERE b.id = 'bud-3'`,
  ).spent;
  assert.equal(spent, 30000);
  run(`DELETE FROM transactions WHERE id = 'tx-bud'`);
});

let impSeq = 0;
const imported = legacyToRows(legacyBackup, () => `imp-${++impSeq}`, 5000);
const impAccount = (name) => imported.tables.accounts.find((a) => a.name === name);

step('backup: legacy rows map with correct signs and minor units', () => {
  assert.equal(imported.tables.transactions.length, 4);
  const exp = imported.tables.transactions.find((t) => t.type === 'expense');
  assert.equal(exp.amount_minor, 120050); // 1200.50 major → minor
  assert.equal(exp.account_id, impAccount('Cash').id);
  assert.equal(impAccount('Cash').kind, 'cash');
  assert.equal(impAccount('Bank Transfer').kind, 'bank');
  const inc = imported.tables.transactions.find((t) => t.type === 'income');
  assert.equal(inc.amount_minor, 8500000);
  const lend = imported.tables.transactions.find((t) => t.type === 'lend');
  assert.equal(lend.amount_minor, 500000);
  assert.equal(lend.contact_id, imported.tables.contacts[0].id);
  const repay = imported.tables.transactions.find((t) => t.type === 'repay_in');
  assert.equal(repay.amount_minor, 200000);
  const cat = imported.tables.categories.find((c) => c.name === 'Kiryana / Grocery');
  assert.equal(exp.category_id, cat.id);
});

step('backup: imported legacy rows land in the db with right balances', () => {
  const { tables } = imported;
  for (const a of tables.accounts) {
    run(
      `INSERT OR IGNORE INTO accounts (id, name, kind, currency, opening_minor, archived_at, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id, a.name, a.kind, a.currency, a.opening_minor, a.archived_at, a.deleted_at, a.created_at,
    );
  }
  for (const c of tables.categories) {
    run(`INSERT OR IGNORE INTO categories (id, name, kind, sort, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`, c.id, c.name, c.kind, c.sort, c.deleted_at, c.created_at);
  }
  for (const c of tables.contacts) {
    run(`INSERT OR IGNORE INTO contacts (id, name, phone, note, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`, c.id, c.name, c.phone, c.note, c.deleted_at, c.created_at);
  }
  for (const t of tables.transactions) {
    run(
      `INSERT OR IGNORE INTO transactions (id, type, amount_minor, currency, account_id, to_account_id, category_id, contact_id, note, occurred_at, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.id, t.type, t.amount_minor, t.currency, t.account_id, t.to_account_id, t.category_id, t.contact_id, t.note, t.occurred_at, t.created_at, t.deleted_at,
    );
  }

  assert.equal(balance(impAccount('Cash').id), -420050); // −1,200.50 spent −5,000 lent + 2,000 received back
  assert.equal(balance(impAccount('Bank Transfer').id), 8500000);
  assert.equal(delta(tables.contacts[0].id), 300000); // 5,000 lent − 2,000 repaid
});

step('backup: new-format round trip survives describe + normalize', () => {
  const payload = buildBackupPayload(imported.tables, 6000, 1);
  const desc = describeBackup(payload);
  assert.equal(desc.ok, true);
  assert.equal(desc.format, 'udhaar-v1');
  assert.equal(desc.counts.transactions, 4);
  const norm = normalizeNewTables(payload.tables);
  assert.equal(norm.tables.transactions.length, 4);
  assert.equal(norm.tables.accounts.length, imported.tables.accounts.length);
});

step('backup: budgets survive the round trip and damaged rows are dropped', () => {
  const tables = {
    ...imported.tables,
    budgets: [{ id: 'bud-x', category_id: 'cat-kiryana', currency: 'PKR', amount_minor: 1500000, deleted_at: null, created_at: 7000 }],
  };
  const payload = buildBackupPayload(tables, 7000, SCHEMA_VERSION);
  const desc = describeBackup(payload);
  assert.equal(desc.counts.budgets, 1);
  const norm = normalizeNewTables(payload.tables);
  assert.equal(norm.tables.budgets.length, 1);
  assert.equal(norm.tables.budgets[0].amount_minor, 1500000);
  const damaged = normalizeNewTables({ budgets: [{ id: 'y', category_id: '', amount_minor: 0 }] });
  assert.equal(damaged.tables.budgets.length, 0);
  assert.match(damaged.warnings.join(' '), /budget/);
});

step('backup: bad files are refused with reasons', () => {
  assert.equal(describeBackup({ hello: 'world' }).ok, false);
  assert.equal(describeBackup('nonsense').ok, false);
  const newer = describeBackup({ app: 'udhaar', kind: 'backup', schemaVersion: 999, tables: {} });
  assert.equal(newer.ok, false);
  assert.match(newer.error, /newer version/);
});

console.log('db-check: all invariants hold');

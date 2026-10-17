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

console.log('db-check: all invariants hold');

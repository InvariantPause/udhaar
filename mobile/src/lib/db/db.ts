import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, seedStatements } from './schema';

const DB_NAME = 'udhaar.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Open → migrate → seed, once per process. Everything is synchronous
 * (`*Sync`), so screens can query during render with zero loading states —
 * that is the speed budget for the 3-second capture.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (db) return db;
  const next = SQLite.openDatabaseSync(DB_NAME);
  migrate(next);
  seed(next);
  db = next;
  return db;
}

function migrate(d: SQLite.SQLiteDatabase): void {
  const row = d.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const statements = MIGRATIONS[version];
    const to = version + 1;
    d.withTransactionSync(() => {
      for (const sql of statements) d.execSync(sql);
      d.execSync(`PRAGMA user_version = ${to}`);
    });
    version = to;
  }
}

function seed(d: SQLite.SQLiteDatabase): void {
  const seeded = d.getFirstSync<{ value: string }>(`SELECT value FROM meta WHERE key = 'seeded'`);
  if (seeded) return;
  d.withTransactionSync(() => {
    for (const sql of seedStatements(Date.now())) d.execSync(sql);
  });
}

/**
 * Local-only id: time prefix (sorts roughly) + random tail.
 * Never auto-increment — ids cross into undo records and backups as-is.
 */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

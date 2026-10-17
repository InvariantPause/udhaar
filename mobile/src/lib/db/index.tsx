import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getDb } from './db';

interface DbControl {
  /** increments after every mutation — useDbQuery reads it to re-run queries */
  rev: number;
  bump: () => void;
}

const DbContext = createContext<DbControl | null>(null);

/**
 * Opens the database before the first screen renders and hands out the
 * revision counter that powers reactivity:
 *
 *   const rows = useDbQuery(() => repo.listRecentTxs());
 *   // ...after any mutation: bump();
 *
 * No state library, no watchers — SQLite is the store, `rev` is the signal.
 *
 * Always read through `useDbQuery` — never `useMemo(fn, [rev])`. The React
 * Compiler infers memo dependencies from what the callback actually reads,
 * so a bare `[rev]` dep is dropped and the query computes once per mount.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [rev, setRev] = useState(0);
  // Open synchronously during first render so children never query a closed db.
  useState(() => {
    getDb();
    return true;
  });
  const bump = useCallback(() => setRev((r) => r + 1), []);
  return <DbContext.Provider value={{ rev, bump }}>{children}</DbContext.Provider>;
}

export function useDb(): DbControl {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used inside <DbProvider>');
  return ctx;
}

/**
 * Runs a SQLite read and re-runs it whenever the database revision changes.
 * `rev` is read inside the memo on purpose: the React Compiler only keeps
 * dependencies a callback actually reads, so this is what guarantees the
 * query re-runs after every mutation. The argument can be ignored.
 */
export function useDbQuery<T>(run: (rev: number) => T): T {
  const { rev } = useDb();
  return useMemo(() => run(rev), [rev, run]);
}

export * from './types';
export * as repo from './repo';

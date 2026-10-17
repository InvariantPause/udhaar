import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { getDb } from './db';

interface DbControl {
  /** increments after every mutation — screens re-run their queries on [rev] */
  rev: number;
  bump: () => void;
}

const DbContext = createContext<DbControl | null>(null);

/**
 * Opens the database before the first screen renders and hands out the
 * revision counter that powers reactivity:
 *
 *   const { rev, bump } = useDb();
 *   const rows = useMemo(() => repo.listRecentTxs(), [rev]);
 *   // ...after any mutation: bump();
 *
 * No state library, no watchers — SQLite is the store, `rev` is the signal.
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

export * from './types';
export * as repo from './repo';

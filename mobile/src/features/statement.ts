import type { ContactBalance, TxView } from '@/lib/db';
import { formatDate, formatDay } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { txPersonMinor, txSubtitle, txTitle } from './txDisplay';

/**
 * Plain-text Udhaar statement for one person — made to paste into WhatsApp.
 * Person-centric signs: + means they owe you more, − means you owe them more.
 * Pure on purpose (no db, no React) so it can be tested and reused.
 */
export function buildStatement(opts: { name: string; balances: ContactBalance[]; txs: TxView[] }): string {
  const { name, balances, txs } = opts;
  const lines: string[] = [`${name} — Udhaar`, formatDate(Date.now()), ''];

  if (balances.length === 0) {
    lines.push('Settled up');
  } else {
    for (const b of balances) {
      lines.push(
        b.delta > 0
          ? `They owe you ${formatMoney(b.delta, b.currency)}`
          : `You owe them ${formatMoney(-b.delta, b.currency)}`,
      );
    }
  }

  if (txs.length > 0) {
    lines.push('', `History (${txs.length})`);
    for (const t of txs) {
      lines.push(`${txTitle(t)} · ${txSubtitle(t)} · ${formatMoney(txPersonMinor(t), t.currency, { sign: true })}`);
    }
  }

  lines.push('', 'Sent from Udhaar');
  return lines.join('\n');
}

/** One-line preview used by tests and future surfaces. */
export function statementSubject(name: string): string {
  return `${name} — Udhaar · ${formatDay(Date.now())}`;
}

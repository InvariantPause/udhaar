import { useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Segmented } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';
import { repo, useDbQuery, type CategoryTotal, type ReportTotals } from '@/lib/db';

type PeriodMode = 'month' | 'last' | 'all';

const PERIODS: { value: PeriodMode; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'last', label: 'Last month' },
  { value: 'all', label: 'All time' },
];

function periodRange(mode: PeriodMode): { from: number; to: number; label: string } {
  const now = new Date();
  if (mode === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
      label: 'This month',
    };
  }
  if (mode === 'last') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      label: 'Last month',
    };
  }
  return { from: 0, to: now.getTime() + 1, label: 'All time' };
}

const CURRENCY_ORDER = ['PKR', 'INR', 'USD', 'EUR'];
const currencyRank = (c: string) => {
  const i = CURRENCY_ORDER.indexOf(c);
  return i === -1 ? CURRENCY_ORDER.length : i;
};

/**
 * Reports: truly spent vs lent out, per currency, never converted.
 * "Spent" counts expenses only — udhaar gets its own card so lending is
 * visible without pretending it was consumption.
 */
export default function ReportsScreen() {
  const [mode, setMode] = useState<PeriodMode>('month');

  const period = periodRange(mode);
  const totals = useDbQuery(() =>
    repo.reportTotals(period.from, period.to).sort((a, b) => currencyRank(a.currency) - currencyRank(b.currency)),
  );
  const spentCats = useDbQuery(() => repo.reportCategoryTotals('expense', period.from, period.to));
  const incomeCats = useDbQuery(() => repo.reportCategoryTotals('income', period.from, period.to));

  return (
    <Screen title="Reports">
      <Segmented options={PERIODS} value={mode} onChange={setMode} />

      {totals.length === 0 ? (
        <EmptyState
          icon="chart"
          title={mode === 'all' ? 'Nothing recorded yet' : `Nothing in ${period.label.toLowerCase()}`}
          note="Entries you add will show up here."
        />
      ) : (
        totals.map((t) => (
          <CurrencyReport
            key={t.currency}
            totals={t}
            spentCats={spentCats.filter((c) => c.currency === t.currency)}
            incomeCats={incomeCats.filter((c) => c.currency === t.currency)}
            showCurrency={totals.length > 1}
          />
        ))
      )}
    </Screen>
  );
}

function CurrencyReport({
  totals: t,
  spentCats,
  incomeCats,
  showCurrency,
}: {
  totals: ReportTotals;
  spentCats: CategoryTotal[];
  incomeCats: CategoryTotal[];
  showCurrency: boolean;
}) {
  const moneyIn = t.income + t.borrowed + t.repaidIn;
  const moneyOut = t.spent + t.lent + t.repaidOut;
  const net = moneyIn - moneyOut;
  const hasUdhaar = t.lent + t.borrowed + t.repaidIn + t.repaidOut > 0;

  return (
    <View style={styles.block}>
      {showCurrency ? <Text style={styles.currencyTag}>{t.currency}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Spent</Text>
        <Money minor={t.spent} currency={t.currency} style={styles.spentAmount} />
        {spentCats.length > 0 ? (
          <View style={styles.bars}>
            {spentCats.slice(0, 8).map((c) => (
              <BarRow
                key={`${c.category_id ?? 'none'}`}
                label={categoryLabel(c)}
                amount={c.total}
                currency={t.currency}
                max={spentCats[0]?.total ?? 1}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.cardNote}>No spending in this period.</Text>
        )}
      </View>

      {hasUdhaar ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Udhaar</Text>
          {t.lent > 0 ? <FlowRow label="Lent out" minor={-t.lent} currency={t.currency} /> : null}
          {t.borrowed > 0 ? <FlowRow label="Borrowed in" minor={t.borrowed} currency={t.currency} /> : null}
          {t.repaidIn > 0 ? <FlowRow label="They repaid you" minor={t.repaidIn} currency={t.currency} /> : null}
          {t.repaidOut > 0 ? <FlowRow label="You repaid" minor={-t.repaidOut} currency={t.currency} /> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Flow</Text>
        <FlowRow label="Money in" minor={moneyIn} currency={t.currency} />
        <FlowRow label="Money out" minor={-moneyOut} currency={t.currency} />
        <View style={styles.divider} />
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net in places</Text>
          <Money minor={net} currency={t.currency} sign style={styles.netAmount} />
        </View>
        {incomeCats.length > 0 ? (
          <View style={styles.bars}>
            <Text style={[styles.cardNote, styles.barsTitle]}>Income by category</Text>
            {incomeCats.slice(0, 6).map((c) => (
              <BarRow
                key={`${c.category_id ?? 'none'}`}
                label={categoryLabel(c)}
                amount={c.total}
                currency={t.currency}
                max={incomeCats[0]?.total ?? 1}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function categoryLabel(c: CategoryTotal): string {
  if (c.category) return c.category;
  return c.category_id ? 'Removed category' : 'Uncategorized';
}

function FlowRow({ label, minor, currency }: { label: string; minor: number; currency: string }) {
  return (
    <View style={styles.flowRow}>
      <Text style={styles.flowLabel}>{label}</Text>
      <Money minor={minor} currency={currency} sign style={styles.flowMoney} />
    </View>
  );
}

function BarRow({ label, amount, currency, max }: { label: string; amount: number; currency: string; max: number }) {
  const pct = max > 0 ? Math.max((amount / max) * 100, 2) : 2;
  const width = `${pct}%` as DimensionValue;
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Money minor={amount} currency={currency} style={styles.barAmount} />
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12, marginBottom: 18 },
  currencyTag: { ...typography.section, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 18,
    gap: 10,
  },
  cardLabel: { ...typography.section, fontSize: 11 },
  spentAmount: { fontSize: 34 },
  cardNote: { ...typography.caption, marginTop: 4 },
  bars: { marginTop: 4, gap: 10 },
  barsTitle: { marginTop: 12, marginBottom: 0 },
  barRow: { gap: 6 },
  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  barLabel: { ...typography.body, flex: 1, minWidth: 0 },
  barAmount: { fontSize: 14 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.white },
  flowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flowLabel: { ...typography.body, color: colors.muted },
  flowMoney: { fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  netLabel: { ...typography.label },
  netAmount: { fontSize: 20 },
});

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, ChipRow } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';
import { TransactionSheet } from '@/features/TransactionSheet';
import { txDisplayMinor, txIcon, txShowsSign, txSubtitle, txTitle } from '@/features/txDisplay';
import { repo, useDbQuery, type TxSearchOpts } from '@/lib/db';
import { useSheet } from '@/lib/sheet';

type KindFilter = NonNullable<TxSearchOpts['kind']>;
type PeriodFilter = 'all' | 'month' | 'last';

const KINDS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'udhaar', label: 'Udhaar' },
];

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'month', label: 'This month' },
  { value: 'last', label: 'Last month' },
];

const LIMIT = 200;

function periodRange(mode: PeriodFilter): { from?: number; to?: number } {
  const now = new Date();
  if (mode === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  }
  if (mode === 'last') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    };
  }
  return {};
}

/** Find any entry: text over notes/people/places/amounts + kind and period filters. */
export default function SearchScreen() {
  const sheet = useSheet();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const isFiltering = query.trim().length > 0 || kind !== 'all' || period !== 'all';
  const results = useDbQuery(() =>
    isFiltering ? repo.searchTxs({ query, kind, ...periodRange(period), limit: LIMIT }) : [],
  );

  return (
    <Screen title="Search" sub="Find any entry" back>
      <Input value={query} onChangeText={setQuery} placeholder="Note, person, place, amount…" autoFocus />
      <Text style={styles.filterLabel}>Kind</Text>
      <ChipRow>
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </ChipRow>
      <Text style={styles.filterLabel}>When</Text>
      <ChipRow>
        {PERIODS.map((p) => (
          <Chip key={p.value} label={p.label} active={period === p.value} onPress={() => setPeriod(p.value)} />
        ))}
      </ChipRow>

      {!isFiltering ? (
        <EmptyState icon="search" title="Search your entries" note="Notes, people, places, amounts — anything." />
      ) : results.length === 0 ? (
        <EmptyState icon="search" title="Nothing found" note="Try a different word or filter." />
      ) : (
        <>
          <Text style={styles.count}>
            {results.length === LIMIT
              ? `First ${LIMIT} matches`
              : `${results.length} ${results.length === 1 ? 'entry' : 'entries'}`}
          </Text>
          <View style={styles.section}>
            {results.map((t, i) => (
              <ListRow
                key={t.id}
                icon={txIcon(t)}
                title={txTitle(t)}
                subtitle={txSubtitle(t)}
                right={<Money minor={txDisplayMinor(t)} currency={t.currency} sign={txShowsSign(t)} />}
                onPress={() => sheet.open(<TransactionSheet tx={t} />)}
                onLongPress={() => sheet.open(<TransactionSheet tx={t} />)}
                last={i === results.length - 1}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterLabel: { ...typography.section, fontSize: 11, marginTop: 22, marginBottom: 10 },
  count: { ...typography.caption, marginTop: 24, marginBottom: 8 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
});

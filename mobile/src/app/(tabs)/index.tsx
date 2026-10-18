import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { AccountSheet } from '@/features/AccountSheet';
import { TransactionSheet } from '@/features/TransactionSheet';
import { accountIcon, txDisplayMinor, txIcon, txShowsSign, txSubtitle, txTitle } from '@/features/txDisplay';
import { repo, useDb, useDbQuery, type CurrencySummary, type RecurringView, type TxView } from '@/lib/db';
import { dayOfMonth, monthKey, monthRange } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

/**
 * Today: where the money is (per currency, never converted) + the recent
 * ledger. Long-press or tap an entry to edit, swipe to delete, undo via toast.
 */
export default function TodayScreen() {
  const router = useRouter();
  const { bump } = useDb();
  const toast = useToast();
  const sheet = useSheet();

  const summary = useDbQuery(() => repo.moneySummary());
  const txs = useDbQuery(() => repo.listRecentTxs(60));
  // Caps that are 80%+ through the month — a quiet nudge, not a nag.
  const { from, to } = monthRange();
  const budgetWatch = useDbQuery(() => repo.listBudgets(from, to)).filter(
    (b) => b.spent >= b.amount_minor * 0.8,
  );
  // Bills whose day has come this month and that haven't been handled yet.
  const period = monthKey();
  const dueBills = useDbQuery(() => repo.listDueRecurring(dayOfMonth(), period));

  const deleteTx = (t: TxView) => {
    const at = repo.deleteTx(t.id);
    bump();
    haptic.press();
    toast.show('Entry deleted', {
      actionLabel: 'Undo',
      onAction: () => {
        repo.restoreTx(t.id, at);
        bump();
      },
    });
  };

  const logBill = (b: RecurringView) => {
    try {
      const { txId, previous } = repo.logRecurring(b.id, period);
      bump();
      haptic.success();
      toast.show(`${b.name} logged`, {
        actionLabel: 'Undo',
        onAction: () => {
          repo.undoLogRecurring(b.id, txId, previous);
          bump();
        },
      });
    } catch {
      toast.show('Could not log the bill');
    }
  };

  const skipBill = (b: RecurringView) => {
    const previous = repo.skipRecurring(b.id, period);
    bump();
    haptic.press();
    toast.show(`${b.name} skipped this month`, {
      actionLabel: 'Undo',
      onAction: () => {
        repo.restoreRecurringPeriod(b.id, previous);
        bump();
      },
    });
  };

  return (
    <Screen
      title="Today"
      sub="Balances & recent entries"
      right={<IconButton icon="search" label="Search entries" onPress={() => router.push('/search')} />}
    >
      {summary.length === 0 ? (
        <View style={styles.startCard}>
          <Text style={styles.startTitle}>Add a money place</Text>
          <Text style={styles.startNote}>Cash, bank, or wallet.</Text>
          <Pressable
            style={styles.startBtn}
            onPress={() => {
              haptic.tap();
              sheet.open(<AccountSheet />);
            }}
          >
            <Text style={styles.startBtnLabel}>Add place</Text>
          </Pressable>
        </View>
      ) : (
        summary.map((s) => <MoneyCard key={s.currency} summary={s} />)
      )}

      {dueBills.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Due</Text>
          <View style={styles.section}>
            {dueBills.map((b, i) => (
              <View key={b.id} style={[styles.dueRow, i < dueBills.length - 1 && styles.dueLine]}>
                <Pressable style={styles.dueInfo} onLongPress={() => skipBill(b)} delayLongPress={350}>
                  <Text style={styles.dueName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.dueSub} numberOfLines={1}>
                    Day {b.due_day} · {b.account_name ?? 'Removed place'}
                  </Text>
                </Pressable>
                <Money minor={b.amount_minor} currency={b.currency} style={styles.dueMoney} />
                <Pressable style={styles.logPill} onPress={() => logBill(b)}>
                  <Text style={styles.logLabel}>Log</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {budgetWatch.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Budget watch</Text>
          <View style={styles.section}>
            {budgetWatch.map((b, i) => (
              <Pressable
                key={b.id}
                onPress={() => {
                  haptic.tap();
                  router.push('/reports');
                }}
                style={[styles.watchRow, i < budgetWatch.length - 1 && styles.watchLine]}
              >
                <Text style={styles.watchName} numberOfLines={1}>
                  {b.category_name ?? 'Removed category'}
                </Text>
                <Text style={styles.watchValue}>
                  {b.spent > b.amount_minor
                    ? `${formatMoney(b.spent - b.amount_minor, b.currency)} over`
                    : `${Math.round((b.spent / b.amount_minor) * 100)}%`}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Recent</Text>
      {txs.length === 0 ? (
        <EmptyState icon="wallet" title="Nothing yet" note="Tap + to add your first entry." />
      ) : (
        <View style={styles.section}>
          {txs.map((t, i) => (
            <ListRow
              key={t.id}
              icon={txIcon(t)}
              title={txTitle(t)}
              subtitle={txSubtitle(t)}
              right={<Money minor={txDisplayMinor(t)} currency={t.currency} sign={txShowsSign(t)} />}
              onPress={() => sheet.open(<TransactionSheet tx={t} />)}
              onLongPress={() => sheet.open(<TransactionSheet tx={t} />)}
              onDelete={() => deleteTx(t)}
              last={i === txs.length - 1}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function MoneyCard({ summary }: { summary: CurrencySummary }) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        haptic.tap();
        router.push('/accounts');
      }}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel}>In your places · {summary.currency}</Text>
        <Icon name="chevronRight" size={16} color={colors.muted2} />
      </View>
      <Money minor={summary.inPlaces} currency={summary.currency} style={typography.moneyDisplay} />
      <View style={styles.places}>
        {summary.places.map((p) => (
          <View key={p.account.id} style={styles.placeRow}>
            <View style={styles.placeNameRow}>
              <Icon name={accountIcon(p.account.kind)} size={14} color={colors.muted2} />
              <Text style={styles.placeName} numberOfLines={1}>
                {p.account.name}
              </Text>
            </View>
            <Money minor={p.balance_minor} currency={summary.currency} style={styles.placeMoney} />
          </View>
        ))}
        {summary.lent > 0 || summary.borrowed > 0 ? (
          <View style={styles.udhaarBlock}>
            <Text style={styles.udhaarTitle}>Udhaar</Text>
            {summary.lent > 0 ? (
              <View style={styles.placeRow}>
                <Text style={styles.udhaarLabel}>Lent out</Text>
                <Money minor={summary.lent} currency={summary.currency} style={styles.udhaarMoney} />
              </View>
            ) : null}
            {summary.borrowed > 0 ? (
              <View style={styles.placeRow}>
                <Text style={styles.udhaarLabel}>Borrowed</Text>
                <Money minor={summary.borrowed} currency={summary.currency} style={styles.udhaarMoney} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xxl,
    padding: 18,
    marginBottom: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardLabel: { ...typography.section, fontSize: 11 },
  places: { marginTop: 14, gap: 8 },
  placeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  placeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
  placeName: { ...typography.body, color: colors.muted },
  placeMoney: { fontSize: 15 },
  udhaarBlock: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  udhaarLabel: { ...typography.body, color: colors.muted2 },
  udhaarMoney: { fontSize: 15 },
  udhaarTitle: { ...typography.section, fontSize: 10.5, color: colors.muted2 },
  sectionTitle: { ...typography.section, marginTop: 14, marginBottom: 10 },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  watchLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 },
  watchName: { ...typography.body, color: colors.muted, flex: 1, minWidth: 0 },
  watchValue: { ...typography.label },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  dueLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 },
  dueInfo: { flex: 1, minWidth: 0, gap: 3 },
  dueName: { ...typography.body },
  dueSub: { ...typography.caption },
  dueMoney: { fontSize: 15 },
  logPill: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  logLabel: { ...typography.label, color: colors.inverse },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  startCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xxl,
    padding: 20,
    gap: 8,
  },
  startTitle: { ...typography.h2 },
  startNote: { ...typography.small },
  startBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  startBtnLabel: { ...typography.label, color: colors.inverse },
});

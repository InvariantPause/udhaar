import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { AccountSheet } from '@/features/AccountSheet';
import { TransactionSheet } from '@/features/TransactionSheet';
import { accountIcon, txDisplayMinor, txIcon, txShowsSign, txSubtitle, txTitle } from '@/features/txDisplay';
import { repo, useDb, useDbQuery, type CurrencySummary, type TxView } from '@/lib/db';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

/**
 * Today: where the money is (per currency, never converted) + the recent
 * ledger. Long-press or tap an entry to edit, swipe to delete, undo via toast.
 */
export default function TodayScreen() {
  const { bump } = useDb();
  const toast = useToast();
  const sheet = useSheet();

  const summary = useDbQuery(() => repo.moneySummary());
  const txs = useDbQuery(() => repo.listRecentTxs(60));

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

  return (
    <Screen title="Today" sub="Balances & recent entries">
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
  sectionTitle: { ...typography.section, marginTop: 14, marginBottom: 10 },
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

import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, fonts, haptic, radius, text as typography } from '@/design';
import { BudgetSheet } from '@/features/BudgetSheet';
import { repo, useDbQuery, type BudgetWithSpent } from '@/lib/db';
import { monthRange } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useSheet } from '@/lib/sheet';

/** Monthly caps per category — one bar each, tap to edit. */
export default function BudgetsScreen() {
  const sheet = useSheet();
  const { from, to } = monthRange();

  const budgets = useDbQuery(() => repo.listBudgets(from, to));

  const openSheet = (budget?: BudgetWithSpent) => {
    haptic.tap();
    sheet.open(<BudgetSheet budget={budget} />);
  };

  return (
    <Screen
      title="Budgets"
      sub="Monthly caps"
      back
      right={<IconButton icon="plus" label="Add budget" onPress={() => openSheet()} />}
    >
      {budgets.length === 0 ? (
        <>
          <EmptyState
            icon="target"
            title="No budgets yet"
            note="Set a monthly cap per category — progress shows here and in Reports."
          />
          <Button label="Add budget" variant="primary" icon="plus" onPress={() => openSheet()} />
        </>
      ) : (
        <>
          <Text style={styles.month}>This month</Text>
          <View style={styles.card}>
            {budgets.map((b, i) => {
              const over = b.spent > b.amount_minor;
              const pct = Math.min(b.spent / b.amount_minor, 1) * 100;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => openSheet(b)}
                  style={[styles.row, i < budgets.length - 1 && styles.rowLine]}
                >
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>
                      {b.category_name ?? 'Removed category'}
                    </Text>
                    <Money minor={b.spent} currency={b.currency} style={styles.spent} />
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(pct, 2)}%` as DimensionValue }]} />
                  </View>
                  <Text style={over ? styles.over : styles.left}>
                    {over
                      ? `${formatMoney(b.spent - b.amount_minor, b.currency)} over`
                      : `${formatMoney(b.amount_minor - b.spent, b.currency)} left`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Progress counts this month&apos;s expenses in the budget&apos;s currency.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  month: { ...typography.section, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { ...typography.body, flex: 1, minWidth: 0 },
  spent: { ...typography.label },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.white },
  left: { ...typography.caption },
  over: { ...typography.caption, fontFamily: fonts.semibold, color: colors.text },
  hint: { ...typography.caption, marginTop: 12 },
});

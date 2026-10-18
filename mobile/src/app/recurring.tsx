import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, fonts, haptic, radius, text as typography } from '@/design';
import { RecurringSheet } from '@/features/RecurringSheet';
import { repo, useDbQuery, type RecurringView } from '@/lib/db';
import { dayOfMonth, monthKey } from '@/lib/format';
import { useSheet } from '@/lib/sheet';

/** Monthly bills — what's due, what's handled, one tap to edit or log. */
export default function RecurringScreen() {
  const sheet = useSheet();

  const bills = useDbQuery(() => repo.listRecurring());
  const period = monthKey();
  const today = dayOfMonth();

  const openSheet = (bill?: RecurringView) => {
    haptic.tap();
    sheet.open(<RecurringSheet bill={bill} />);
  };

  const status = (b: RecurringView): 'done' | 'due' | 'later' =>
    b.done_period === period ? 'done' : b.due_day <= today ? 'due' : 'later';

  return (
    <Screen
      title="Recurring"
      sub="Monthly bills"
      back
      right={<IconButton icon="plus" label="Add bill" onPress={() => openSheet()} />}
    >
      {bills.length === 0 ? (
        <>
          <EmptyState
            icon="repeat"
            title="No bills yet"
            note="Rent, internet, school fees — add one and log it in a tap when its day comes."
          />
          <Button label="Add bill" variant="primary" icon="plus" onPress={() => openSheet()} />
        </>
      ) : (
        <>
          <Text style={styles.month}>This month</Text>
          <View style={styles.card}>
            {bills.map((b, i) => {
              const s = status(b);
              return (
                <Pressable
                  key={b.id}
                  onPress={() => openSheet(b)}
                  style={[styles.row, i < bills.length - 1 && styles.rowLine]}
                >
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      Day {b.due_day} · {b.account_name ?? 'Removed place'}
                      {b.type === 'income' ? ' · Income' : ''}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Money minor={b.amount_minor} currency={b.currency} style={styles.money} />
                    <Text style={s === 'due' ? styles.statusDue : styles.statusOther}>
                      {s === 'done' ? 'Done' : s === 'due' ? 'Due' : 'Later'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Tap a bill to edit or skip it. Logged bills become normal entries — find them in Recent.
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 16 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 },
  info: { flex: 1, minWidth: 0, gap: 3 },
  name: { ...typography.body },
  sub: { ...typography.caption },
  right: { alignItems: 'flex-end', gap: 3 },
  money: { fontSize: 15 },
  statusDue: { ...typography.caption, fontFamily: fonts.semibold, color: colors.text },
  statusOther: { ...typography.caption },
  hint: { ...typography.caption, marginTop: 12 },
});

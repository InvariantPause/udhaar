import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { FieldLabel } from '@/components/Field';
import { Input } from '@/components/Input';
import { haptic, text as typography } from '@/design';
import { repo, useDb, useDbQuery, type RecurringType, type RecurringView } from '@/lib/db';
import { monthKey } from '@/lib/format';
import { fromMinor, toMinor } from '@/lib/money';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const TYPES: { value: RecurringType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

interface RecurringSheetProps {
  /** present = edit that bill */
  bill?: RecurringView;
}

/** Add or edit a monthly bill — logged in one tap from Today when its day comes. */
export function RecurringSheet({ bill }: RecurringSheetProps) {
  const { close } = useSheet();
  const { bump } = useDb();
  const toast = useToast();

  // Bills are logged from a place; a new bill starts where you last used one.
  const defaults = useDbQuery(() => {
    const accounts = repo.listAccounts();
    const last = accounts.find((a) => a.id === (repo.getMeta('last_account_id') ?? '')) ?? accounts[0];
    return { accounts, lastId: last?.id ?? '' };
  });

  const [name, setName] = useState(bill?.name ?? '');
  const [type, setType] = useState<RecurringType>(bill?.type ?? 'expense');
  const [amount, setAmount] = useState(bill ? String(fromMinor(bill.amount_minor, bill.currency)) : '');
  const [accountId, setAccountId] = useState(bill?.account_id ?? defaults.lastId);
  const [categoryId, setCategoryId] = useState<string | null>(bill?.category_id ?? null);
  const [dueDay, setDueDay] = useState(bill?.due_day ?? 1);

  const categories = useDbQuery(() => repo.listCategories(type));

  // Currency always follows the place — the app never converts money.
  const account = defaults.accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? bill?.currency ?? 'PKR';

  const minor = toMinor(amount || '0', currency);
  const canSave = name.trim().length > 0 && minor > 0 && accountId.length > 0;

  const period = monthKey();
  const handled = bill?.done_period === period;

  const onSave = () => {
    try {
      repo.saveRecurring({
        id: bill?.id,
        name,
        type,
        amount_minor: minor,
        currency,
        account_id: accountId,
        category_id: categoryId,
        due_day: dueDay,
      });
      bump();
      haptic.success();
      close();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the bill');
    }
  };

  const onSkip =
    bill && !handled
      ? () => {
          const previous = repo.skipRecurring(bill.id, period);
          bump();
          haptic.press();
          close();
          toast.show(`${bill.name} skipped this month`, {
            actionLabel: 'Undo',
            onAction: () => {
              repo.restoreRecurringPeriod(bill.id, previous);
              bump();
            },
          });
        }
      : undefined;

  const onDelete = bill
    ? () => {
        const at = repo.deleteRecurring(bill.id);
        bump();
        haptic.press();
        close();
        toast.show('Bill removed', {
          actionLabel: 'Undo',
          onAction: () => {
            repo.restoreRecurring(bill.id, at);
            bump();
          },
        });
      }
    : undefined;

  return (
    <View style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wrap}
        style={styles.scroll}
      >
        <Text style={styles.title}>{bill ? 'Edit bill' : 'New bill'}</Text>

        <Input label="Name" value={name} onChangeText={setName} placeholder="Internet, Rent, School fees…" autoFocus={!bill} />

        <View>
          <FieldLabel>Type</FieldLabel>
          <ChipRow>
            {TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                active={t.value === type}
                onPress={() => {
                  setType(t.value);
                  setCategoryId(null);
                }}
              />
            ))}
          </ChipRow>
        </View>

        <View>
          <FieldLabel>Amount per month</FieldLabel>
          <AmountInput value={amount} onChangeText={setAmount} currency={currency} />
        </View>

        <View>
          <FieldLabel>Place</FieldLabel>
          {defaults.accounts.length === 0 ? (
            <Text style={styles.hint}>Add a money place first — bills are logged from one.</Text>
          ) : (
            <ChipRow>
              {defaults.accounts.map((a) => (
                <Chip key={a.id} label={a.name} active={a.id === accountId} onPress={() => setAccountId(a.id)} />
              ))}
            </ChipRow>
          )}
        </View>

        <View>
          <FieldLabel>Category</FieldLabel>
          <ChipRow>
            <Chip label="None" active={categoryId === null} onPress={() => setCategoryId(null)} />
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
            ))}
          </ChipRow>
        </View>

        <View>
          <FieldLabel>Due day</FieldLabel>
          <ChipRow>
            {DAYS.map((d) => (
              <Chip key={d} label={String(d)} active={d === dueDay} onPress={() => setDueDay(d)} />
            ))}
          </ChipRow>
        </View>

        {onSkip ? <Button label="Skip this month" variant="ghost" icon="x" onPress={onSkip} /> : null}
        {onDelete ? <Button label="Delete bill" variant="ghost" icon="trash" onPress={onDelete} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={bill ? 'Save changes' : 'Add bill'} variant="primary" icon="check" disabled={!canSave} onPress={onSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  wrap: { paddingBottom: 4, gap: 16 },
  footer: { paddingTop: 12 },
  title: { ...typography.h2 },
  hint: { ...typography.caption },
});

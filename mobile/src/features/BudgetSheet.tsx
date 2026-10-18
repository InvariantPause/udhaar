import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { FieldLabel } from '@/components/Field';
import { haptic, text as typography } from '@/design';
import { repo, useDb, useDbQuery, type BudgetWithSpent } from '@/lib/db';
import { fromMinor, toMinor } from '@/lib/money';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

const CURRENCIES = ['PKR', 'USD', 'INR', 'EUR'];

interface BudgetSheetProps {
  /** present = edit that cap */
  budget?: BudgetWithSpent;
}

/** Add or edit one monthly cap: a category, a currency, an amount. */
export function BudgetSheet({ budget }: BudgetSheetProps) {
  const { close } = useSheet();
  const { bump } = useDb();
  const toast = useToast();

  const categories = useDbQuery(() => repo.listCategories('expense'));
  // A new cap starts in the currency of the place you used last.
  const lastCurrency = useDbQuery(
    () => repo.getAccount(repo.getMeta('last_account_id') ?? '')?.currency ?? 'PKR',
  );

  const [categoryId, setCategoryId] = useState(budget?.category_id ?? categories[0]?.id ?? '');
  const [currency, setCurrency] = useState(budget?.currency ?? lastCurrency);
  const [amount, setAmount] = useState(budget ? String(fromMinor(budget.amount_minor, budget.currency)) : '');

  const minor = toMinor(amount || '0', currency);
  const canSave = categoryId.length > 0 && minor > 0;

  const onSave = () => {
    try {
      repo.saveBudget({ id: budget?.id, category_id: categoryId, currency, amount_minor: minor });
      bump();
      haptic.success();
      close();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the budget');
    }
  };

  const onDelete = budget
    ? () => {
        const at = repo.deleteBudget(budget.id);
        bump();
        haptic.press();
        close();
        toast.show('Budget removed', {
          actionLabel: 'Undo',
          onAction: () => {
            repo.restoreBudget(budget.id, at);
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
        <Text style={styles.title}>{budget ? 'Edit budget' : 'New budget'}</Text>

        <View>
          <FieldLabel>Category</FieldLabel>
          <ChipRow>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
            ))}
          </ChipRow>
        </View>

        <View>
          <FieldLabel>Amount per month</FieldLabel>
          <AmountInput value={amount} onChangeText={setAmount} currency={currency} autoFocus={!budget} />
        </View>

        <View>
          <FieldLabel>Currency</FieldLabel>
          <ChipRow>
            {CURRENCIES.map((c) => (
              <Chip key={c} label={c} active={c === currency} onPress={() => setCurrency(c)} />
            ))}
          </ChipRow>
        </View>

        {onDelete ? <Button label="Delete budget" variant="ghost" icon="trash" onPress={onDelete} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={budget ? 'Save changes' : 'Add budget'}
          variant="primary"
          icon="check"
          disabled={!canSave}
          onPress={onSave}
        />
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
});

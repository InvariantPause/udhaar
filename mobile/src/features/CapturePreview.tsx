import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Money } from '@/components/Money';
import { colors, fonts, haptic, radius, text as typography } from '@/design';
import { toMinor, type CurrencyCode } from '@/lib/money';
import { useSheet } from '@/lib/sheet';

const CATEGORIES = ['Kiryana', 'Chai', 'Petrol', 'Aata', 'Mobile Load', 'Wifi'];

/**
 * The 3-second capture sheet — native keyboard, one tap to a category,
 * details stay one row down. Shows the real parser live.
 */
export function CapturePreview({ currency = 'PKR' as CurrencyCode }: { currency?: CurrencyCode }) {
  const { close } = useSheet();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const minor = useMemo(() => toMinor(amount, currency), [amount, currency]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      <Text style={styles.title}>Quick add</Text>
      <Text style={styles.sub}>Native keyboard. One tap to a category. Details stay one row down.</Text>
      <AmountInput value={amount} onChangeText={setAmount} currency={currency} autoFocus />
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              haptic.tap();
              setCategory(c);
            }}
            style={[styles.chip, c === category && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, c === category && styles.chipLabelActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      {minor > 0 ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Expense · {category}</Text>
          <Money minor={-minor} currency={currency} style={styles.previewAmount} />
        </View>
      ) : null}
      <Button
        label="Save entry"
        variant="primary"
        icon="check"
        disabled={minor <= 0}
        onPress={() => {
          haptic.success();
          close();
        }}
      />
      <Text style={styles.note}>Storage arrives with the next build — for now, this is the capture feel.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8, gap: 14 },
  title: { ...typography.h2 },
  sub: { ...typography.small, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  chipLabelActive: { color: colors.inverse },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewLabel: { ...typography.small },
  previewAmount: { fontSize: 20 },
  note: { ...typography.caption, textAlign: 'center' },
});

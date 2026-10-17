import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '@/design';
import { currencyDef } from '@/lib/money';

interface AmountInputProps {
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
  autoFocus?: boolean;
  placeholder?: string;
}

/** The 3-second capture amount bar — native keyboard, big mono digits. */
export function AmountInput({ value, onChangeText, currency, autoFocus = false, placeholder = '0' }: AmountInputProps) {
  const c = currencyDef(currency);
  return (
    <View style={styles.bar}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>
          {c.sym} {currency}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        selectionColor={colors.white}
        style={styles.input}
        accessibilityLabel="Amount"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface2,
    borderColor: colors.line2,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 6,
  },
  chip: {
    backgroundColor: colors.surface3,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  input: {
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 32,
    letterSpacing: -1,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 8,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
});

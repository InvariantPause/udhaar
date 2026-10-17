import { Text, type StyleProp, type TextStyle } from 'react-native';
import { text as typography } from '@/design';
import { formatMoney, type CurrencyCode } from '@/lib/money';

interface MoneyProps {
  /** integer minor units */
  minor: number;
  currency: CurrencyCode;
  /** force an explicit + / − */
  sign?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Signed, tabular-figure money text. Pure mono — emphasis via weight, not color. */
export function Money({ minor, currency, sign = false, style }: MoneyProps) {
  return (
    <Text style={[typography.money, style]} numberOfLines={1}>
      {formatMoney(minor, currency, { sign })}
    </Text>
  );
}

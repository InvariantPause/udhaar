import type { TextStyle } from 'react-native';
import { colors } from './colors';

/** Inter — loaded once in the root layout (src/app/_layout.tsx). */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/** Money styles use tabular figures so digits never dance. */
const nums: TextStyle = { fontVariant: ['tabular-nums'] };

/** The type ramp. */
export const text = {
  display: { fontFamily: fonts.extrabold, fontSize: 42, letterSpacing: -1.6, color: colors.text, ...nums },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.9, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.4, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.1, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, letterSpacing: -0.1, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  caption: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted2 },
  section: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted },
  money: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.2, color: colors.text, ...nums },
  moneyDisplay: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1.4, color: colors.text, ...nums },
} satisfies Record<string, TextStyle>;

import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, haptic, radius, springs } from '@/design';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

interface ButtonProps {
  label: string;
  icon?: IconName;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  onPress?: () => void;
  style?: object;
}

/** Pure-mono button. Primary = the single loud element (white on black). */
export function Button({
  label,
  icon,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onPress,
  style,
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.045 }],
  }));

  const fg = variant === 'primary' ? colors.inverse : variant === 'ghost' ? colors.muted : colors.text;

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => {
          pressed.value = withSpring(1, springs.press);
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, springs.press);
        }}
        onPress={() => {
          haptic.tap();
          onPress?.();
        }}
        style={[styles.base, size === 'sm' ? styles.sm : styles.md, styles[variant], disabled && styles.disabled]}
      >
        {icon ? <Icon name={icon} size={17} color={fg} /> : null}
        <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: fg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  md: { paddingVertical: 14, paddingHorizontal: 18 },
  sm: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm },
  primary: { backgroundColor: colors.white },
  secondary: { backgroundColor: colors.surface2, borderColor: colors.line2 },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.bold, fontSize: 14.5, letterSpacing: -0.2 },
  labelSm: { fontSize: 13 },
});

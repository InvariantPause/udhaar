import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, haptic, radius, springs } from '@/design';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  /** accessibility label */
  label: string;
  onPress: () => void;
  /** tile size, default 38 (matches the header round buttons) */
  size?: number;
  faint?: boolean;
}

/** Square icon tile — header actions, inline confirms, quick tools. */
export function IconButton({ icon, label, onPress, size = 38, faint = false }: IconButtonProps) {
  const pressed = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.06 }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        onPressIn={() => {
          pressed.value = withSpring(1, springs.press);
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, springs.press);
        }}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={[styles.tile, { width: size, height: size }, faint && styles.faint]}
      >
        <Icon name={icon} size={Math.round(size * 0.5)} color={faint ? colors.muted : colors.text} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faint: { backgroundColor: 'transparent', borderColor: 'transparent' },
});

import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, springs } from '@/design';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** screen-reader name */
  label: string;
}

/** Mono switch — white track when on, hairline when off. Springs, never eases. */
export function Toggle({ value, onValueChange, label }: ToggleProps) {
  const x = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    x.value = withSpring(value ? 20 : 0, springs.snappy);
  }, [value, x]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackOn]}
    >
      <Animated.View style={[styles.knob, value && styles.knobOn, knob]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line2,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.white },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.muted2 },
  knobOn: { backgroundColor: colors.bg },
});

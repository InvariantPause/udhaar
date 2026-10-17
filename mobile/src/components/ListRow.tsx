import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, haptic, layout, radius, springs } from '@/design';
import { Icon, type IconName } from './Icon';

/** revealed width of the delete action */
const ACTION_W = 92;

interface ListRowProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  last?: boolean;
}

/**
 * The core list row: swipe left to reveal delete, long-press for actions.
 * iOS-like: 1:1 finger tracking on the UI thread, spring settle, fling to open.
 */
export function ListRow({ icon, title, subtitle, right, onPress, onLongPress, onDelete, last = false }: ListRowProps) {
  const x = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const startX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-16, 16])
    .onStart(() => {
      startX.value = x.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      x.value = Math.min(0, Math.max(-ACTION_W - 28, next));
    })
    .onEnd((e) => {
      const shouldOpen = x.value < -ACTION_W / 2 || e.velocityX < -650;
      isOpen.value = shouldOpen;
      x.value = withSpring(shouldOpen ? -ACTION_W : 0, springs.snappy);
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (!success) return;
    if (isOpen.value) {
      isOpen.value = false;
      x.value = withSpring(0, springs.snappy);
      runOnJS(haptic.tap)();
      return;
    }
    if (onPress) runOnJS(onPress)();
  });

  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(() => {
      runOnJS(haptic.press)();
      if (onLongPress) runOnJS(onLongPress)();
    });

  const gesture = Gesture.Race(pan, Gesture.Exclusive(longPress, tap));

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.wrap}>
      {onDelete ? (
        <View style={styles.action}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              haptic.press();
              onDelete();
            }}
            accessibilityLabel={`Delete ${title}`}
          >
            <Icon name="trash" size={20} color={colors.inverse} />
            <Text style={styles.actionLabel}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.row, !last && styles.separator, rowStyle]}>
          {icon ? (
            <View style={styles.iconTile}>
              <Icon name={icon} size={20} color={colors.text} />
            </View>
          ) : null}
          <View style={styles.middle}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ?? null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: layout.rowHeight,
    backgroundColor: colors.surface,
  },
  separator: { borderBottomWidth: layout.hairline, borderBottomColor: colors.line },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  middle: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.2, color: colors.text },
  subtitle: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_W,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.inverse },
});

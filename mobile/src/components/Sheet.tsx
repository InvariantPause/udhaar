import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, springs } from '@/design';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * Bottom sheet with iOS-like presentation: spring in, finger-tracked
 * drag-to-dismiss on the grab area, backdrop fade, hardware-back closes.
 */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const [mounted, setMounted] = useState(visible);
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const basePad = Math.max(insets.bottom, 14) + 8;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.value = 0;
      progress.value = withSpring(1, springs.sheet);
    } else {
      dragY.value = 0;
      progress.value = withSpring(0, springs.sheet, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, dragY, progress]);

  // Android hardware back closes the sheet before anything else.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dragY.value > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        dragY.value = withSpring(0, springs.sheet);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [winH, 0]) + dragY.value }],
  }));
  // The inset gap is only needed while the keyboard is closed — with it up the
  // panel sits directly on the keyboard and the inset area is already covered.
  const padStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(keyboardProgress.value, [0, 1], [basePad, 8]),
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sheet" />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.avoider} pointerEvents="box-none">
        {/* Cap in pixels on purpose: a percentage maxHeight resolves against the
            KAV content box, which the keyboard shrinks — the panel would then
            squeeze its footer instead of using the space above the keyboard. */}
        <Animated.View style={[styles.panel, { maxHeight: winH * 0.88 }, padStyle, panelStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone}>
              <View style={styles.grabber} />
            </View>
          </GestureDetector>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  avoider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  panel: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: layout.hairline,
    borderColor: colors.line2,
  },
  grabZone: { paddingTop: 12, paddingBottom: 14, alignItems: 'center' },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.line2 },
  content: { paddingHorizontal: 18, paddingBottom: 6 },
});

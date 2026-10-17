import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, haptic, radius, springs } from '@/design';

interface ToastOptions {
  /** renders a tap target on the right — "Undo" is the reason this exists */
  actionLabel?: string;
  onAction?: () => void;
  /** ms on screen; defaults 5s with an action, 2.6s without */
  duration?: number;
}

interface ToastState extends ToastOptions {
  message: string;
  key: number;
}

const ToastContext = createContext<{ show: (message: string, opts?: ToastOptions) => void } | null>(null);

/**
 * The undo home. Mounted OUTSIDE the sheet host so a toast fired from inside
 * a closing sheet still paints above it. One toast at a time — a new one
 * replaces the old (and cancels its timer).
 */
export function ToastHost({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    progress.value = withSpring(0, springs.snappy, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [progress]);

  const show = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, ...opts, key: Date.now() });
      setMounted(true);
      progress.value = 0;
      progress.value = withSpring(1, springs.snappy);
      timer.current = setTimeout(dismiss, opts.duration ?? (opts.onAction ? 5000 : 2600));
    },
    [dismiss, progress],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [26, 0]) }],
  }));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {mounted && toast ? (
          <Animated.View style={[styles.wrap, { bottom: insetBottom(insets.bottom) }, panelStyle]}>
            <View style={styles.pill}>
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
              {toast.actionLabel ? (
                <Pressable
                  accessibilityLabel={toast.actionLabel}
                  hitSlop={8}
                  onPress={() => {
                    haptic.tap();
                    toast.onAction?.();
                    dismiss();
                  }}
                  style={styles.action}
                >
                  <Text style={styles.actionLabel}>{toast.actionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

/** clears the tab bar (62) + breathing room (16) */
function insetBottom(safeBottom: number): number {
  return Math.max(safeBottom, 8) + 78;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastHost>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  message: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, letterSpacing: -0.2, color: colors.inverse },
  action: { paddingVertical: 2 },
  actionLabel: { fontFamily: fonts.extrabold, fontSize: 13.5, letterSpacing: -0.1, color: colors.inverse },
});

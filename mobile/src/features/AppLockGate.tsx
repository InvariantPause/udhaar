import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, haptic, text as typography } from '@/design';
import { repo } from '@/lib/db';

/**
 * Device-lock gate: with the app lock on, a cold start and every return from
 * background sit behind the phone's own screen lock. No second secret.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [locked, setLocked] = useState(() => repo.getMeta('app_lock') === '1');
  // Bumped when the app returns to the foreground so the prompt fires again.
  const [attempts, setAttempts] = useState(0);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        // The phone has no lock of its own — never trap the user behind nothing.
        setLocked(false);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Udhaar',
        disableDeviceFallback: false,
      });
      if (res.success) {
        haptic.success();
        setLocked(false);
      }
    } catch {
      // stay locked — the button is there for a retry
    } finally {
      busy.current = false;
    }
  }, []);

  // Prompt the moment the gate comes up: cold start, or a return to foreground.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, attempts, unlock]);

  // Leaving the foreground re-arms the gate; coming back asks again.
  // (Lint flags these setStates-in-effect as false positives — AppState
  // change is a user-driven async event, not a render cascade.)
  useEffect(() => {
    const enabled = () => repo.getMeta('app_lock') === '1';
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        if (enabled()) setLocked(true);
        return;
      }
      if (next === 'active' && enabled()) {
        setLocked(true);
        setAttempts((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.root}>
      {children}
      {locked ? (
        <View style={[styles.cover, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.brand}>
            <Icon name="lock" size={30} color={colors.muted} />
            <Text style={styles.wordmark}>Udhaar</Text>
            <Text style={styles.note}>Locked — unlock with your device screen lock.</Text>
          </View>
          <Button label="Unlock" variant="primary" onPress={() => void unlock()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brand: { alignItems: 'center', gap: 12 },
  wordmark: { ...typography.title },
  note: { ...typography.small, textAlign: 'center' },
});

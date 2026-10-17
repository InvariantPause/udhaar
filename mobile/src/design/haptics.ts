import * as Haptics from 'expo-haptics';

/** Fire-and-forget haptics. Never await, never throw. */
export const haptic = {
  /** light tick — taps, selections */
  tap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** medium thump — commit actions, destructive reveals */
  press: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** success pattern — saved, deleted, settled */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** selection tick — tab switches */
  select: () => {
    Haptics.selectionAsync().catch(() => {});
  },
};

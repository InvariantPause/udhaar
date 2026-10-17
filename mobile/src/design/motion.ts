import type { WithSpringConfig } from 'react-native-reanimated';

/**
 * Spring presets — every animation in the app runs through one of these.
 * iOS-like: physics, not duration curves. Tap through them in the Design Kit.
 */
export const springs = {
  /** button / card press in & out */
  press: { damping: 26, stiffness: 420, mass: 0.7 },
  /** chips, tabs, toggles — quick and settled */
  snappy: { damping: 22, stiffness: 330, mass: 0.9 },
  /** layout shifts, list reveals — smooth */
  soft: { damping: 24, stiffness: 190, mass: 1 },
  /** bottom sheets and screens */
  sheet: { damping: 26, stiffness: 260, mass: 0.9 },
  /** expressive spring — celebrations only */
  bouncy: { damping: 13, stiffness: 320, mass: 0.9 },
} satisfies Record<string, WithSpringConfig>;

/** Timing fallbacks for non-physical transitions (opacity, color crossfades). */
export const durations = {
  fast: 140,
  base: 220,
  slow: 340,
} as const;

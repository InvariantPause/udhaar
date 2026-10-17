import { StyleSheet } from 'react-native';

/** 4pt spacing grid. */
export const space = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  sheet: 30,
  full: 999,
} as const;

export const layout = {
  screenPadding: 18,
  rowHeight: 64,
  tabBarHeight: 62,
  hairline: StyleSheet.hairlineWidth,
} as const;

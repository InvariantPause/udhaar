import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/design';

/**
 * Minimal stroke icon set — 24×24, stroke 2, round caps.
 * Pure mono: icons only ever paint with `color`.
 */
const glyphs = {
  home: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V21h14V9.5" />
    </>
  ),
  users: (
    <>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  chart: (
    <>
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  menu: (
    <>
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Line x1="3" y1="12" x2="21" y2="12" />
      <Line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  plus: (
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  trash: (
    <>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ),
  check: <Polyline points="20 6 9 17 4 12" />,
  chevronLeft: <Polyline points="15 18 9 12 15 6" />,
  chevronRight: <Polyline points="9 18 15 12 9 6" />,
  x: (
    <>
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  download: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  upload: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="17 8 12 3 7 8" />
      <Line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  share: (
    <>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
  arrowDown: (
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Polyline points="19 12 12 19 5 12" />
    </>
  ),
  arrowUp: (
    <>
      <Line x1="12" y1="19" x2="12" y2="5" />
      <Polyline points="5 12 12 5 19 12" />
    </>
  ),
  repeat: (
    <>
      <Polyline points="17 1 21 5 17 9" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Polyline points="7 23 3 19 7 15" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  target: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1.5" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  cloud: <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
  bolt: <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  wallet: (
    <>
      <Path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <Path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <Path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </>
  ),
  bank: (
    <>
      <Polygon points="12 2 20 7 4 7" />
      <Line x1="6" y1="18" x2="6" y2="11" />
      <Line x1="10" y1="18" x2="10" y2="11" />
      <Line x1="14" y1="18" x2="14" y2="11" />
      <Line x1="18" y1="18" x2="18" y2="11" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </>
  ),
  phone: (
    <>
      <Rect x="6" y="2.5" width="12" height="19" rx="3" />
      <Line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
    </>
  ),
  box: (
    <>
      <Path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <Polyline points="3 8 12 13 21 8" />
      <Line x1="12" y1="13" x2="12" y2="21" />
    </>
  ),
  lock: (
    <>
      <Rect x="3" y="11" width="18" height="11" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyphs[name]}
    </Svg>
  );
}

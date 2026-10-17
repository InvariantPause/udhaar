/**
 * Udhaar — pure mono palette (dark-first).
 *
 * No hue anywhere: depth comes from contrast, hairlines and frost.
 * Do not introduce accent colors — that is the design system.
 */
export const colors = {
  /** app background (true black for OLED) */
  bg: '#000000',
  /** elevated card / sheet surface */
  surface: '#0E0E0E',
  /** inset surface (inputs, chips, tiles) */
  surface2: '#161616',
  /** pressed / higher inset */
  surface3: '#1F1F1F',
  /** hairline separators */
  line: '#232323',
  /** stronger hairline: control borders */
  line2: '#2E2E2E',
  /** primary text */
  text: '#FAFAFA',
  /** secondary text */
  muted: '#9C9C9C',
  /** tertiary text / placeholders */
  muted2: '#636363',
  /** text & glyphs on white surfaces */
  inverse: '#0A0A0A',
  /** the one loud element: primary buttons, FAB, destructive reveal */
  white: '#FFFFFF',
  /** sheet / modal backdrop */
  overlay: 'rgba(0, 0, 0, 0.62)',
} as const;

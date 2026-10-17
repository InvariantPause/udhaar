import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/design';

/**
 * The Udhaar mark — same geometry as brand/icon-monochrome.svg.
 * Pure mono: it only ever paints with `color`.
 */
export function Brandmark({ size = 26, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={88} fill="none" stroke={color} strokeWidth={13} />
      <Path
        d="M69.3 101.5 A54 54 0 0 1 170.7 101.5"
        fill="none"
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
      />
      <Path
        d="M170.7 138.5 A54 54 0 0 1 69.3 138.5"
        fill="none"
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
      />
      <Path d="M177.6 120.3 L156 104.8 L184.2 94.5 Z" fill={color} />
      <Path d="M62.4 119.7 L84 135.2 L55.8 145.5 Z" fill={color} />
      <Circle cx={120} cy={120} r={9} fill={color} />
    </Svg>
  );
}

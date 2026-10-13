import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

const PARCEL_LID = 'M10 20 L24 6 L72 6 L86 20 Z';
const CAR_BODY = 'M3 14 L6 6 Q7 4 9 4 H21 Q23 4 24 6 L27 14 V18 H3 Z';

export function StickerShadow({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { color } = useTheme();
  return (
    <View style={[styles.shadow, { shadowColor: color('--color-sticker-shadow') }, style]}>
      {children}
    </View>
  );
}

function outlineWidth(size: number, viewBoxWidth: number) {
  const border = size >= 48 ? vars['--sticker-border'] : vars['--sticker-border-small'];
  return (2 * border * viewBoxWidth) / size;
}

export function ParcelArt({ width }: { width: number }) {
  const { color } = useTheme();
  const white = color('--color-sticker-border');
  const stroke = outlineWidth(width, 96);
  return (
    <Svg width={width} height={(width * 80) / 96} viewBox="0 0 96 80" style={styles.visible}>
      <G stroke={white} strokeWidth={stroke} strokeLinejoin="round" fill={white}>
        <Rect x={10} y={20} width={76} height={52} rx={4} />
        <Path d={PARCEL_LID} />
      </G>
      <Rect x={10} y={20} width={76} height={52} rx={4} fill={color('--color-sticker-pickup')} />
      <Path d={PARCEL_LID} fill={color('--color-sticker-pickup')} />
      <Path d={PARCEL_LID} fill={white} opacity={0.22} />
      <Rect x={42} y={6} width={12} height={66} fill={white} opacity={0.45} />
    </Svg>
  );
}

export function CarArt({ width, body, window }: { width: number; body: string; window: string }) {
  const { color } = useTheme();
  const white = color('--color-sticker-border');
  const ink = color('--color-on-card-ride');
  const stroke = outlineWidth(width, 30);
  return (
    <Svg width={width} height={(width * 22) / 30} viewBox="0 0 30 22" style={styles.visible}>
      <G stroke={white} strokeWidth={stroke} strokeLinejoin="round" fill={white}>
        <Path d={CAR_BODY} />
        <Circle cx={8.5} cy={18} r={3} />
        <Circle cx={21.5} cy={18} r={3} />
      </G>
      <Path d={CAR_BODY} fill={body} />
      <Rect x={8} y={7} width={14} height={5} rx={1.5} fill={window} opacity={0.75} />
      <Circle cx={8.5} cy={18} r={3} fill={ink} />
      <Circle cx={21.5} cy={18} r={3} fill={ink} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowOffset: { width: 0, height: vars['--sticker-shadow-y'] / 2 },
    shadowOpacity: 1,
    shadowRadius: vars['--sticker-shadow-blur'] / 2,
  },
  visible: { overflow: 'visible' },
});

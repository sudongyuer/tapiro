import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Grain } from './Grain';
import { useTheme } from './theme/useTheme';

export function MomentBackground({
  children,
  style,
  ...rest
}: ViewProps & { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View {...rest} style={[styles.fill, { backgroundColor: color('--color-moment-bg') }, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Grain color={color('--color-moment-grain')} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

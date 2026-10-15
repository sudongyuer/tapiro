import { StyleSheet, View } from 'react-native';

import { AppText, type AppTextProps } from './AppText';
import { useTheme } from './theme/useTheme';

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7, 0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [-0.7, -0.7],
] as const;

export type OutlinedTextProps = AppTextProps & { outline: number; ink: string };

export function OutlinedText({ outline, ink, style, children, ...rest }: OutlinedTextProps) {
  const { color } = useTheme();
  const white = color('--color-sticker-border');
  return (
    <View>
      {DIRECTIONS.map(([dx, dy]) => (
        <AppText
          key={`${dx},${dy}`}
          variant={rest.variant}
          style={[
            style,
            styles.copy,
            {
              color: white,
              transform: [{ translateX: dx * outline }, { translateY: dy * outline }],
            },
          ]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {children}
        </AppText>
      ))}
      <AppText {...rest} style={[style, { color: ink }]}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute', left: 0, right: 0, top: 0 },
});

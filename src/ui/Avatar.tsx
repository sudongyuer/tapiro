import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme/useTheme';

export function Avatar({
  uri,
  size,
  label,
  initial,
}: {
  uri: string | null;
  size: number;
  label: string;
  initial?: string;
}) {
  const { color } = useTheme();
  const frame = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={frame}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, frame]} contentFit="cover" />
      ) : initial ? (
        <View style={[styles.initial, frame, { backgroundColor: color('--color-card-calm') }]}>
          <AppText variant="meta" style={[styles.letter, { color: color('--color-on-card-calm') }]}>
            {initial}
          </AppText>
        </View>
      ) : (
        <SymbolView
          name="person.crop.circle.fill"
          size={size}
          tintColor={PlatformColor('tertiaryLabel')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: PlatformColor('secondarySystemGroupedBackground') },
  initial: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700' },
});

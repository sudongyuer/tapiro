import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

export function Avatar({ uri, size, label }: { uri: string | null; size: number; label: string }) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={frame}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, frame]} contentFit="cover" />
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
});

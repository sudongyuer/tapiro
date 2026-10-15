import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ObjectSticker } from '@/ui/ObjectSticker';

import type { PlacedSticker } from './welcomeLayout';
import { useHop, usePop } from './welcomeMotion';

export function WelcomeSticker({
  sticker,
  label,
  onPress,
}: {
  sticker: PlacedSticker;
  label: string;
  onPress: () => void;
}) {
  const pop = usePop(sticker.delay, sticker.drift);
  const { style: hopStyle, hop } = useHop();
  return (
    <Animated.View style={[styles.place, { left: sticker.x, top: sticker.y }, pop]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={`welcome-sticker-${sticker.kind}`}
        onPress={() => {
          hop();
          onPress();
        }}
      >
        <Animated.View style={[{ transform: [{ rotate: `${sticker.rotate}deg` }] }, hopStyle]}>
          <ObjectSticker kind={sticker.kind} width={sticker.width} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ place: { position: 'absolute' } });

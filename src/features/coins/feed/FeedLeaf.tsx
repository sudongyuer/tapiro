import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { StageLeaf } from '@/ui/MascotStageParts';

const LEAF_SIZE = 26;

export function FeedLeaf({ style }: { style: ComponentProps<typeof Animated.View>['style'] }) {
  return (
    <Animated.View style={[styles.leaf, style]} pointerEvents="none">
      <StageLeaf size={LEAF_SIZE} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leaf: { position: 'absolute', left: '6%', top: '58%' },
});

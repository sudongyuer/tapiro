import { HStack, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { Mascot } from './Mascot';

const HEAD = 12;

export function TierMark({ label, rank }: { label: string; rank: 1 | 2 | 3 | 4 }) {
  return (
    <HStack
      spacing={3}
      modifiers={[accessibilityElement('ignore'), accessibilityLabel(label), fixedSize()]}
    >
      <RNHostView matchContents>
        <View style={styles.heads}>
          {Array.from({ length: rank }, (_, index) => (
            <Mascot key={index} variant="front" size={HEAD} />
          ))}
        </View>
      </RNHostView>
      <Text
        modifiers={[
          font({ textStyle: 'footnote' }),
          foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          lineLimit(1),
        ]}
      >
        {label}
      </Text>
    </HStack>
  );
}

const styles = StyleSheet.create({
  heads: { flexDirection: 'row', gap: 1 },
});

import { HStack, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  lineLimit,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { Mascot } from './Mascot';

const HEAD = 12;

export function TierMark({
  label,
  rank,
  modifiers = [],
}: {
  label: string;
  rank: 1 | 2 | 3 | 4;
  modifiers?: ModifierConfig[];
}) {
  return (
    <HStack
      spacing={3}
      modifiers={[accessibilityElement('ignore'), accessibilityLabel(label), ...modifiers]}
    >
      <RNHostView matchContents>
        <View style={styles.heads}>
          {Array.from({ length: rank }, (_, index) => (
            <Mascot key={index} variant="front" size={HEAD} darkOutline />
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

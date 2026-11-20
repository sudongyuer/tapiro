import { HStack, Image, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
} from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from './AppText';
import { FADE_IN, FADE_OUT } from './theme/motion';
import { vars } from './theme/tokens';

const ICON = 13;
const SYMBOL = 'wifi.exclamationmark';
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function OfflineSection({ text, testID }: { text: string; testID: string }) {
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <HStack
        spacing={vars['--space-2']}
        modifiers={[
          frame({ maxWidth: Infinity }),
          accessibilityElement('combine'),
          accessibilityIdentifier(testID),
        ]}
      >
        <Image systemName={SYMBOL} size={ICON} modifiers={[secondary, accessibilityHidden()]} />
        <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>{text}</Text>
      </HStack>
    </Section>
  );
}

export function OfflineLine({ text, testID }: { text: string; testID: string }) {
  return (
    <Animated.View
      accessible
      accessibilityLabel={text}
      testID={testID}
      entering={FADE_IN}
      exiting={FADE_OUT}
      style={styles.line}
    >
      <SymbolView name={SYMBOL} size={ICON} tintColor={PlatformColor('secondaryLabel')} />
      <AppText variant="meta" tone="secondaryLabel">
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-2'],
    paddingVertical: vars['--space-1'],
  },
});

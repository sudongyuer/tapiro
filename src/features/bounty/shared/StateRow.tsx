import { RNHostView, Section } from '@expo/ui/swift-ui';
import { listRowBackground, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { vars } from '@/ui/theme/tokens';

const NO_INSETS = listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 });
const FORM_MARGIN = vars['--space-4'];

// RNHostView measures its RN root at the text's unwrapped width inside a Form row, so a long line runs past the card
// edge; the root takes the row's width (the window less the inset-grouped margins) to make the text wrap.
export function StateRow({ children }: { children: ReactElement }) {
  const { width } = useWindowDimensions();
  return (
    <Section modifiers={[listRowBackground('clear'), NO_INSETS]}>
      <RNHostView matchContents={{ vertical: true }}>
        <View style={{ width: width - FORM_MARGIN * 2 }}>{children}</View>
      </RNHostView>
    </Section>
  );
}

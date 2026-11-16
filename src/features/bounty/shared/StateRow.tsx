import { RNHostView, Section } from '@expo/ui/swift-ui';
import { listRowBackground, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';

const NO_INSETS = listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 });

export function StateRow({ children }: { children: ReactElement }) {
  return (
    <Section modifiers={[listRowBackground('clear'), NO_INSETS]}>
      <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
    </Section>
  );
}

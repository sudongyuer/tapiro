import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { vars } from '@/ui/theme/tokens';
import { useSheetFill } from '@/ui/theme/useSheetFill';

import { splitLead } from './splitLead';

export function FailureCard({
  text,
  dizzy,
  testID,
  textTestID,
  children,
}: {
  text: string;
  dizzy: boolean;
  testID: string;
  textTestID: string;
  children?: ReactNode;
}) {
  const fill = useSheetFill();
  const { lead, rest } = splitLead(text);
  return (
    <View style={[styles.card, { backgroundColor: fill }]} testID={testID}>
      <Mascot variant="front" size={vars['--touch-min']} dizzy={dizzy} darkOutline />
      <View style={styles.body}>
        <View style={styles.words}>
          <AppText variant="title" testID={textTestID}>
            {lead}
          </AppText>
          {rest ? (
            <AppText variant="secondary" tone="secondaryLabel" testID={`${textTestID}-rest`}>
              {rest}
            </AppText>
          ) : null}
        </View>
        {children ? <View style={styles.buttons}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  body: { flex: 1, gap: vars['--space-3'] },
  words: { gap: vars['--space-1'] },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
});

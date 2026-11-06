import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import type { TierDrop } from '../types';
import { tierDropLines } from './tierDropView';

export function TierDropSheet({
  drop,
  onGotIt,
  onProfile,
}: {
  drop: TierDrop;
  onGotIt: () => void;
  onProfile: (() => void) | null;
}) {
  const { t, language } = useI18n();
  const lines = tierDropLines(drop, t, language);
  return (
    <View style={styles.sheet} testID="tier-drop-sheet">
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header" testID="tier-drop-title">
          {lines.title}
        </AppText>
        {lines.reasons.map((reason, index) => (
          <AppText key={reason} variant="body" testID={`tier-drop-reason-${index}`}>
            {reason}
          </AppText>
        ))}
        <AppText variant="body" testID="tier-drop-way-back">
          {lines.wayBack}
        </AppText>
      </View>
      <View style={styles.actions}>
        <PillButton
          label={t('reputation.tierDrop.gotIt')}
          onPress={onGotIt}
          testID="tier-drop-got-it"
        />
        {onProfile ? (
          <PillButton
            label={t('reputation.tierDrop.profile')}
            variant="plain"
            onPress={onProfile}
            testID="tier-drop-profile"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-2'],
    gap: vars['--space-5'],
  },
  text: { gap: vars['--space-3'] },
  actions: { gap: vars['--space-2'] },
});

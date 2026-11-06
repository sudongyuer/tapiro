import { PlatformColor, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { textLength, toggleChip } from '../model';
import { REVIEW_TEXT_MAX, type ReviewDraft, type Role } from '../types';
import { ChipPicker } from './ReviewPickers';

const REVEAL_IN = FadeIn.duration(vars['--duration-settle']).reduceMotion(ReduceMotion.Never);

export function ReviewDetails({
  draft,
  role,
  disabled,
  onChange,
}: {
  draft: ReviewDraft;
  role: Role;
  disabled: boolean;
  onChange: (next: ReviewDraft) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const count = textLength(draft.sentence);
  return (
    <Animated.View entering={REVEAL_IN} style={styles.details}>
      <AppText variant="body" style={styles.heading} testID="review-chips-title">
        {t(`reputation.sheet.${draft.face === 'happy' ? 'goodChips' : 'badChips'}`)}
      </AppText>
      <ChipPicker
        draft={draft}
        role={role}
        disabled={disabled}
        onToggle={(chip) => onChange(toggleChip(draft, role, chip))}
      />
      <TextInput
        accessibilityLabel={t('reputation.sheet.sentence')}
        editable={!disabled}
        multiline
        onChangeText={(sentence) => onChange({ ...draft, sentence })}
        placeholder={t('reputation.sheet.sentence')}
        placeholderTextColor={PlatformColor('placeholderText')}
        style={[styles.sentence, { color: PlatformColor('label') }]}
        testID="review-sentence"
        value={draft.sentence}
      />
      <AppText
        variant="meta"
        accessibilityLabel={t('reputation.reply.countLabel', { count, max: REVIEW_TEXT_MAX })}
        style={[
          styles.count,
          {
            color:
              count > REVIEW_TEXT_MAX ? color('--color-urgent') : PlatformColor('secondaryLabel'),
          },
        ]}
        testID="review-count"
      >
        {t('reputation.reply.count', { count, max: REVIEW_TEXT_MAX })}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  details: { gap: vars['--space-3'] },
  heading: { fontWeight: '600' },
  sentence: {
    ...typeStyle('body'),
    minHeight: vars['--touch-min'],
    maxHeight: 132,
    padding: vars['--space-3'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('tertiarySystemFill'),
  },
  count: { alignSelf: 'flex-end' },
});

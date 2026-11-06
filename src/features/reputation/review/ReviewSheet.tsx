import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { daysLeft, pickFace } from '../model';
import type { ReviewPair, ReviewTarget } from '../types';
import { pairName, sheetSubtitle } from './reviewView';
import { ReviewDetails } from './ReviewDetails';
import { FacePicker } from './ReviewPickers';
import { SealLayer } from './SealLayer';
import { progress, SEAL } from './sealTimeline';
import { useReviewSheet } from './useReviewSheet';
import { useSealClock } from './useSealClock';

export function ReviewSheet({
  pair,
  target,
  title,
  onClose,
}: {
  pair: ReviewPair;
  target: ReviewTarget;
  title: string | null;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const face = useRef<ViewInstance>(null);
  const name = pairName(pair, t);
  const sheet = useReviewSheet(pair, target, face, name);
  const { draft, update, outcome, busy, frozen, line } = sheet;
  const [placed, setPlaced] = useState(false);
  const seal = useSealClock(outcome !== null && (placed || outcome.revealed), !outcome?.revealed);
  const revealedNow = outcome?.revealed === true || pair.state === 'revealed';

  const form = useAnimatedStyle(() => ({
    opacity:
      outcome === null
        ? 1
        : seal.reduced
          ? 1 - seal.fade.value
          : 1 - progress(seal.clock.value, SEAL.form),
  }));

  return (
    <View style={styles.root} testID="review-sheet">
      <Stack.Screen options={{ title: t('reputation.sheet.title', { name }) }} />
      {outcome ? null : (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button disabled={busy} onPress={onClose}>
            {t('reputation.sheet.cancel')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Animated.View
        style={[styles.root, form]}
        pointerEvents={outcome ? 'none' : 'auto'}
        accessibilityElementsHidden={outcome !== null}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.content}
        >
          <AppText
            variant="secondary"
            tone="secondaryLabel"
            style={styles.subtitle}
            testID="review-subtitle"
          >
            {sheetSubtitle(title, pair, language)}
          </AppText>
          <FacePicker
            picked={draft.face}
            disabled={frozen}
            pickedRef={face}
            onPick={(next) => update(pickFace(draft, pair.role, next))}
          />
          {draft.face ? (
            <ReviewDetails draft={draft} role={pair.role} disabled={frozen} onChange={update} />
          ) : null}
          <View style={styles.actions}>
            {line ? (
              <InlineState
                tone="warning"
                text={t(`reputation.sheet.${line}`)}
                testID="review-failed"
              />
            ) : null}
            {draft.face ? (
              <PillButton
                label={t('reputation.sheet.submit')}
                loading={busy}
                loadingLabel={t('reputation.sheet.submitting')}
                disabled={!sheet.ready && !busy}
                onPress={() => void sheet.submit()}
                testID="review-submit"
              />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
      {outcome ? (
        <SealLayer
          seal={seal}
          face={draft.face}
          from={outcome.from}
          envelope={!outcome.revealed}
          title={t(`reputation.sheet.${revealedNow ? 'revealedTitle' : 'sealedTitle'}`, { name })}
          note={
            revealedNow
              ? t('reputation.sheet.revealedNote', { name })
              : t('reputation.sheet.sealedNote', {
                  name,
                  count: daysLeft(pair.closesAt, new Date()),
                })
          }
          ok={t('reputation.sheet.ok')}
          onPlaced={() => setPlaced(true)}
          onOk={onClose}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-2'],
    paddingBottom: vars['--space-3'],
    gap: vars['--space-5'],
  },
  subtitle: { textAlign: 'center' },
  actions: { gap: vars['--space-3'] },
});

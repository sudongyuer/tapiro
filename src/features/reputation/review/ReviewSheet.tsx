import { Stack, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
  type ViewInstance,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { useReviewSubmit } from '../hooks';
import { daysLeft, draftChanged, draftFromReview, pickFace, toggleChip } from '../model';
import { reviewStore } from '../services';
import { type ReviewDraft, type ReviewPair, type ReviewTarget } from '../types';
import { blockedBy, canSend, findPair, pairName, sheetSubtitle } from './reviewView';
import { ReviewDetails } from './ReviewDetails';
import { FacePicker } from './ReviewPickers';
import { SealLayer, type ScreenRect } from './SealLayer';
import { progress, SEAL } from './sealTimeline';
import { useSealClock } from './useSealClock';

type Outcome = { revealed: boolean; from: ScreenRect | null };

function measured(view: ViewInstance | null) {
  return new Promise<ScreenRect | null>((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

function useDiscardPrompt(active: boolean, sending: boolean, onDrop: () => void) {
  const { t } = useI18n();
  const navigation = useNavigation();
  usePreventRemove(active, ({ data }) => {
    if (sending) return;
    Alert.alert(t('reputation.sheet.discardTitle'), undefined, [
      { text: t('reputation.sheet.discardContinue'), style: 'cancel' },
      {
        text: t('reputation.sheet.discardKeep'),
        onPress: () => navigation.dispatch(data.action),
      },
      {
        text: t('reputation.sheet.discardDrop'),
        style: 'destructive',
        onPress: () => {
          onDrop();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
}

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
  const submitState = useReviewSubmit(target);
  const [base] = useState(() => draftFromReview(pair));
  const [draft, setDraft] = useState<ReviewDraft>(() => reviewStore.draft(target) ?? base);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [placed, setPlaced] = useState(false);
  const face = useRef<ViewInstance>(null);
  const seal = useSealClock(outcome !== null && (placed || outcome.revealed), !outcome?.revealed);
  const name = pairName(pair, t);
  const sending = submitState?.phase === 'sending';
  const failure = submitState?.phase === 'failed' ? submitState.failure : null;
  const refusal = failure ?? (submitting || outcome ? null : blockedBy(pair));
  const ready = canSend(draft, base, pair) && !sending && !refusal;

  useDiscardPrompt(outcome === null && (sending || draftChanged(draft, base)), sending, () =>
    reviewStore.saveDraft(target, null),
  );

  useEffect(() => {
    reviewStore.dismissFailure(target);
  }, [target]);

  useEffect(() => {
    if (failure) AccessibilityInfo.announceForAccessibility(t(`reputation.sheet.${failure}`));
  }, [failure, t]);

  const update = (next: ReviewDraft) => {
    setDraft(next);
    reviewStore.saveDraft(target, draftChanged(next, base) ? next : null);
  };

  const submit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    const sent = await reviewStore.submit(target, pair.role, draft);
    if (!sent) {
      setSubmitting(false);
      return;
    }
    const item = reviewStore.getSnapshot().items[`${target.kind}:${target.itemId}`];
    const stored = item && item.status !== 'idle' ? findPair(item.data ?? [], target) : null;
    const revealed = stored?.state === 'revealed';
    const from = await measured(face.current);
    setOutcome({ revealed, from });
    const line = revealed
      ? t('reputation.sheet.revealedTitle')
      : t('reputation.sheet.sealedTitle', { name });
    AccessibilityInfo.announceForAccessibility(line);
  };

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
          <Stack.Toolbar.Button disabled={sending} onPress={onClose}>
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
            disabled={sending}
            pickedRef={face}
            onPick={(next) => update(pickFace(draft, pair.role, next))}
          />
          {draft.face ? (
            <ReviewDetails draft={draft} role={pair.role} disabled={sending} onChange={update} />
          ) : null}
          <View style={styles.actions}>
            {refusal ? (
              <InlineState
                tone="warning"
                text={t(`reputation.sheet.${refusal}`)}
                testID="review-failed"
              />
            ) : null}
            {draft.face ? (
              <PillButton
                label={t('reputation.sheet.submit')}
                loading={sending}
                loadingLabel={t('reputation.sheet.submitting')}
                disabled={!ready && !sending}
                onPress={() => void submit()}
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
          title={t(`reputation.sheet.${outcome.revealed ? 'revealedTitle' : 'sealedTitle'}`, {
            name,
          })}
          note={
            outcome.revealed
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

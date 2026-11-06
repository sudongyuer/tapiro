import { Stack, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Keyboard,
  PlatformColor,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ViewInstance,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { PillButton } from '@/ui/PillButton';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useReviewSubmit } from '../hooks';
import {
  daysLeft,
  draftChanged,
  draftFromReview,
  pickFace,
  textLength,
  toggleChip,
} from '../model';
import { reviewStore } from '../services';
import { REVIEW_TEXT_MAX, type ReviewDraft, type ReviewPair, type ReviewTarget } from '../types';
import { blockedBy, canSend, findPair, pairName, sheetSubtitle } from './reviewView';
import { ChipPicker, FacePicker } from './ReviewPickers';
import { SealLayer, type ScreenRect } from './SealLayer';
import { progress, SEAL } from './sealTimeline';
import { useSealClock } from './useSealClock';

type Outcome = { revealed: boolean; from: ScreenRect | null };

const REVEAL_IN = FadeIn.duration(vars['--duration-settle']).reduceMotion(ReduceMotion.Never);

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
  const { color } = useTheme();
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
  const count = textLength(draft.sentence);
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
            <Animated.View entering={REVEAL_IN} style={styles.details}>
              <AppText variant="body" style={styles.heading} testID="review-chips-title">
                {t(`reputation.sheet.${draft.face === 'happy' ? 'goodChips' : 'badChips'}`)}
              </AppText>
              <ChipPicker
                draft={draft}
                role={pair.role}
                disabled={sending}
                onToggle={(chip) => update(toggleChip(draft, pair.role, chip))}
              />
              <TextInput
                accessibilityLabel={t('reputation.sheet.sentence')}
                editable={!sending}
                multiline
                onChangeText={(sentence) => update({ ...draft, sentence })}
                placeholder={t('reputation.sheet.sentence')}
                placeholderTextColor={PlatformColor('placeholderText')}
                style={[styles.sentence, { color: PlatformColor('label') }]}
                testID="review-sentence"
                value={draft.sentence}
              />
              <AppText
                variant="meta"
                accessibilityLabel={t('reputation.reply.countLabel', {
                  count,
                  max: REVIEW_TEXT_MAX,
                })}
                style={[
                  styles.count,
                  {
                    color:
                      count > REVIEW_TEXT_MAX
                        ? color('--color-urgent')
                        : PlatformColor('secondaryLabel'),
                  },
                ]}
                testID="review-count"
              >
                {t('reputation.reply.count', { count, max: REVIEW_TEXT_MAX })}
              </AppText>
            </Animated.View>
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

export function ReviewSheetLoading() {
  const { t } = useI18n();
  return (
    <View style={[styles.root, styles.centre]}>
      <ActivityIndicator
        accessible
        accessibilityLabel={t('reputation.sheet.loading')}
        testID="review-loading"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: {
    flexGrow: 1,
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-2'],
    paddingBottom: vars['--space-3'],
    gap: vars['--space-5'],
  },
  subtitle: { textAlign: 'center' },
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
  actions: { marginTop: 'auto', gap: vars['--space-3'] },
});

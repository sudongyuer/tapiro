import { usePreventRemove } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useState, type RefObject } from 'react';
import { AccessibilityInfo, Alert, Keyboard, type ViewInstance } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { useReviewSubmit } from '../hooks';
import { draftChanged, draftFromReview } from '../model';
import { reviewStore } from '../services';
import {
  pairKey,
  type ReviewDraft,
  type ReviewPair,
  type ReviewTarget,
  type SubmitFailure,
} from '../types';
import { blockedBy, canSend, findPair } from './reviewView';
import type { ScreenRect } from './SealLayer';

export type Outcome = { revealed: boolean; from: ScreenRect | null };

const FINAL_FAILURES: readonly SubmitFailure[] = ['closed', 'locked', 'notFound'];

function measured(view: ViewInstance | null) {
  return new Promise<ScreenRect | null>((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

function useDiscardPrompt(active: boolean, busy: boolean, onDrop: () => void) {
  const { t } = useI18n();
  usePreventRemove(active, ({ repeat }) => {
    if (busy) return;
    Alert.alert(t('reputation.sheet.discardTitle'), undefined, [
      { text: t('reputation.sheet.discardContinue'), style: 'cancel' },
      { text: t('reputation.sheet.discardKeep'), onPress: repeat },
      {
        text: t('reputation.sheet.discardDrop'),
        style: 'destructive',
        onPress: () => {
          onDrop();
          repeat();
        },
      },
    ]);
  });
}

const sealLine = (revealed: boolean, name: string, t: TFunction) =>
  revealed ? t('reputation.sheet.revealedTitle') : t('reputation.sheet.sealedTitle', { name });

const storedPair = (target: ReviewTarget) => {
  const item = reviewStore.getSnapshot().items[pairKey(target.kind, target.itemId)];
  return item && item.status !== 'idle' ? findPair(item.data ?? [], target) : null;
};

export function useReviewSheet(
  pair: ReviewPair,
  target: ReviewTarget,
  face: RefObject<ViewInstance | null>,
  name: string,
) {
  const { t } = useI18n();
  const submitState = useReviewSubmit(target);
  const base = draftFromReview(pair);
  const [draft, setDraft] = useState<ReviewDraft>(() => reviewStore.draft(target) ?? base);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<Outcome | null>(null);
  const failure = submitState?.phase === 'failed' ? submitState.failure : null;
  const landedLater = failure === 'failed' && pair.mine !== null && !draftChanged(draft, base);
  const revealedNow = pair.state === 'revealed';
  const outcome = sent ?? (landedLater ? { revealed: revealedNow, from: null } : null);
  const busy = submitting || submitState?.phase === 'sending';
  const blocked = busy || outcome ? null : blockedBy(pair, new Date());
  const final = blocked ?? (failure && FINAL_FAILURES.includes(failure) ? failure : null);
  const line = outcome ? null : (final ?? failure);
  const stored = blocked !== null && pair.mine !== null;
  const shown = stored ? base : draft;
  const changed = draftChanged(shown, base);

  useDiscardPrompt(outcome === null && (busy || (changed && !final)), busy, () =>
    reviewStore.saveDraft(target, null),
  );

  useEffect(() => () => reviewStore.dismissFailure(target), [target]);

  useEffect(() => {
    if (line) AccessibilityInfo.announceForAccessibility(t(`reputation.sheet.${line}`));
  }, [line, t]);

  useEffect(() => {
    if (!busy && !changed) reviewStore.saveDraft(target, null);
  }, [busy, changed, target]);

  useEffect(() => {
    if (landedLater) AccessibilityInfo.announceForAccessibility(sealLine(revealedNow, name, t));
  }, [landedLater, revealedNow, name, t]);

  const finish = async (revealed: boolean) => {
    const from = await measured(face.current);
    setSent({ revealed, from });
    AccessibilityInfo.announceForAccessibility(sealLine(revealed, name, t));
  };

  const update = (next: ReviewDraft) => {
    setDraft(next);
    reviewStore.dismissFailure(target);
    reviewStore.saveDraft(target, draftChanged(next, base) ? next : null);
  };

  const submit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    const sent = await reviewStore.submit(target, pair.role, draft);
    if (sent) await finish(storedPair(target)?.state === 'revealed');
    else setSubmitting(false);
  };

  return {
    draft: shown,
    update,
    submit,
    outcome,
    busy,
    frozen: busy || final !== null,
    line,
    ready: canSend(draft, base, pair) && !busy && !final,
  };
}

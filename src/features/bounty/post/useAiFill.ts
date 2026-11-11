import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { bountyDraftInbox } from '@/lib/drafts/inbox';
import { createStore } from '@/lib/store';
import type { SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';

import { fillFromDraft, undoFill, type AiFill } from './aiFill';
import { draftStore } from './services';
import type { PostDraft } from './types';
import { formError } from './useDraft';

// `at` is when the glow's 1.2 s begin. A fill that arrives as the form opens starts when its sheet has finished rising
// (the sheet's transitionEnd; the sheet waits for 问小貘 to close first), with a fixed delay if no event comes.
export type ShownFill = { userId: string; fill: AiFill; at: number };

export const aiFills = createStore<ShownFill | null>(null);

type SheetEvents = { addListener(event: 'transitionEnd', run: () => void): () => void };

type Texts = { title: SyncedText; reward: SyncedText; description: SyncedText };

function pushText({ title, reward, description }: Texts, patch: Partial<PostDraft>) {
  if (patch.title !== undefined) title.set(patch.title);
  if (patch.rewardText !== undefined) reward.set(patch.rewardText);
  if (patch.description !== undefined) description.set(patch.description ?? '');
}

export function useAiFill(userId: string, texts: Texts, sync: () => void) {
  const shown = useSyncExternalStore(aiFills.subscribe, aiFills.get);
  const { title, reward, description } = texts;

  const navigation = useNavigation();

  useEffect(() => {
    let sheet: (() => void) | null = null;
    const intake = (opening: boolean) => {
      const draft = bountyDraftInbox.take(userId);
      if (!draft) return;
      sync();
      const { patch, fill } = fillFromDraft(draftStore.load(userId), draft, new Date());
      draftStore.update(userId, patch);
      pushText({ title, reward, description }, patch);
      formError.set(null);
      const shown = {
        userId,
        fill,
        at: Date.now() + (opening ? vars['--duration-sheet-rise'] : 0),
      };
      aiFills.set(shown);
      if (!opening) return;
      sheet =
        (navigation.getParent() as SheetEvents | undefined)?.addListener('transitionEnd', () => {
          sheet?.();
          sheet = null;
          if (aiFills.get() === shown) aiFills.set({ ...shown, at: Date.now() });
        }) ?? null;
    };
    intake(true);
    const stop = bountyDraftInbox.subscribe(() => intake(false));
    return () => {
      stop();
      sheet?.();
    };
  }, [userId, title, reward, description, sync, navigation]);

  useEffect(() => () => aiFills.set(null), []);

  const current = shown?.userId === userId ? shown : null;
  const undo = useCallback(() => {
    const fill = aiFills.get();
    if (!fill || fill.userId !== userId) return;
    sync();
    const patch = undoFill(draftStore.load(userId), fill.fill);
    draftStore.update(userId, patch);
    pushText({ title, reward, description }, patch);
    formError.set(null);
    aiFills.set(null);
  }, [userId, title, reward, description, sync]);

  return { shown: current, undo };
}

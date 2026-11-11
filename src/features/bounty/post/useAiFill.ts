import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { bountyDraftInbox } from '@/lib/drafts/inbox';
import { createStore } from '@/lib/store';
import type { SyncedText } from '@/ui/SyncedTextField';

import { fillFromDraft, undoFill, type AiFill } from './aiFill';
import { draftStore } from './services';
import type { PostDraft } from './types';
import { formError } from './useDraft';

export type ShownFill = { userId: string; fill: AiFill; at: number };

export const aiFills = createStore<ShownFill | null>(null);

type Texts = { title: SyncedText; reward: SyncedText; description: SyncedText };

function pushText({ title, reward, description }: Texts, patch: Partial<PostDraft>) {
  if (patch.title !== undefined) title.set(patch.title);
  if (patch.rewardText !== undefined) reward.set(patch.rewardText);
  if (patch.description !== undefined) description.set(patch.description ?? '');
}

export function useAiFill(userId: string, texts: Texts, sync: () => void) {
  const shown = useSyncExternalStore(aiFills.subscribe, aiFills.get);
  const { title, reward, description } = texts;

  useEffect(() => {
    const intake = () => {
      const draft = bountyDraftInbox.take(userId);
      if (!draft) return;
      sync();
      const { patch, fill } = fillFromDraft(draftStore.load(userId), draft, new Date());
      draftStore.update(userId, patch);
      pushText({ title, reward, description }, patch);
      formError.set(null);
      aiFills.set({ userId, fill, at: Date.now() });
    };
    intake();
    return bountyDraftInbox.subscribe(intake);
  }, [userId, title, reward, description, sync]);

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

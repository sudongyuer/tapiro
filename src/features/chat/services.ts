import { randomUUID } from 'expo-crypto';
import { Settings } from 'react-native';

import { addBlockFixturePeople, blockEvents, fixtureBlocked } from '@/features/block';
import { live } from '@/lib/live';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { liveItems } from '@/lib/useLiveItems';
import { userCleanups } from '@/lib/userCleanups';

import { badgeCount } from './badge';
import { createSupabaseChatService } from './chatService';
import { createChatStore } from './chatStore';
import { createDrafts } from './drafts';
import { createFixtureChatService, fixtureChatOptions } from './fixtureChatService';
import { FIXTURE_CHAT_PEOPLE, FIXTURE_CHAT_USER_ID } from './fixtureThreads';
import { createImageCache } from './images/imageCache';
import {
  clearImageCache,
  deviceImageFiles,
  dropOutboxImage,
  keepSentImage,
} from './images/imageFiles';
import { fixtureImageFile } from './images/imageSource';
import { createItemThreads } from './itemThreads';
import { createOutbox } from './outbox';

const CALLS_KEY = 'uiVerifyChatCalls';

function verifyChatService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const calls: unknown[] = [];
  addBlockFixturePeople(FIXTURE_CHAT_PEOPLE);
  return createFixtureChatService({
    ...fixtureChatOptions(uiVerifyArgument, uiVerifyFixture),
    blockedByMe: fixtureBlocked,
    imageFile: async (path) => deviceImageFiles.cached(path) ?? fixtureImageFile(path),
    onCall: (name, args) => {
      calls.push({ name, args });
      Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
    },
  });
}

const outbox = createOutbox(Settings, (entry) => {
  if (entry.image) dropOutboxImage(entry.image.file);
});
export const chatDrafts = createDrafts(Settings);

const service = uiVerify
  ? verifyChatService()
  : createSupabaseChatService(getSupabase(), deviceImageFiles);

export const chatStore = createChatStore({
  service,
  outbox,
  newId: randomUUID,
  keepImage: keepSentImage,
});

export const chatImages = createImageCache(chatStore.imageFile);

export const itemThreads = createItemThreads(service.findThread, chatStore.getSnapshot);

if (uiVerify) {
  outbox.clear(FIXTURE_CHAT_USER_ID);
  chatDrafts.clear(FIXTURE_CHAT_USER_ID);
  clearImageCache();
  const [threadId, draft] = (uiVerifyArgument('uiVerifyChatDraft') ?? '').split('|');
  if (threadId && draft) chatDrafts.set(FIXTURE_CHAT_USER_ID, threadId, draft);
}

// Verify builds keep the shell feed's fixture badge unless a case asks for chat fixtures, so shell cases stay as they were.
const drivesBadge = !uiVerify || uiVerifyArgument('uiVerifyChat') === '1';

if (drivesBadge) {
  chatStore.subscribe(() => liveItems.setUnreadMessages(badgeCount(chatStore.getSnapshot())));
}

live.on(['chat.'], chatStore.onSignal);
blockEvents.onBlocked((personId) => chatStore.markBlocked(personId, true));
blockEvents.onUnblocked((personId) => chatStore.markBlocked(personId, false));

userCleanups.register((userId) => {
  outbox.clear(userId);
  chatDrafts.clear(userId);
  chatImages.clear();
  clearImageCache();
});

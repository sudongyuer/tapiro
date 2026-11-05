import { randomUUID } from 'expo-crypto';
import { Settings } from 'react-native';

import { live } from '@/lib/live';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { liveItems } from '@/lib/useLiveItems';
import { userCleanups } from '@/lib/userCleanups';

import { badgeCount } from './badge';
import { createSupabaseChatService } from './chatService';
import { createChatStore } from './chatStore';
import { createFixtureChatService, fixtureChatOptions } from './fixtureChatService';
import { FIXTURE_CHAT_USER_ID } from './fixtureThreads';
import { createOutbox } from './outbox';

const CALLS_KEY = 'uiVerifyChatCalls';

function verifyChatService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const calls: unknown[] = [];
  return createFixtureChatService({
    ...fixtureChatOptions(uiVerifyArgument, uiVerifyFixture),
    onCall: (name, args) => {
      calls.push({ name, args });
      Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
    },
  });
}

const outbox = createOutbox(Settings);

export const chatStore = createChatStore({
  service: uiVerify ? verifyChatService() : createSupabaseChatService(getSupabase()),
  outbox,
  newId: randomUUID,
});

if (uiVerify) outbox.clear(FIXTURE_CHAT_USER_ID);

// Verify builds keep the shell feed's fixture badge unless a case asks for chat fixtures, so shell cases stay as they were.
const drivesBadge = !uiVerify || uiVerifyArgument('uiVerifyChat') === '1';

if (drivesBadge) {
  chatStore.subscribe(() => liveItems.setUnreadMessages(badgeCount(chatStore.getSnapshot())));
}

live.on(['chat.'], chatStore.onSignal);

userCleanups.register((userId) => outbox.clear(userId));

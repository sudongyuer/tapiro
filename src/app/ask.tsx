import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSignedInUser } from '@/features/account';
import {
  AskConversation,
  askSession,
  pickScreenshot,
  useAskSession,
  useBellySlots,
  useConsentFor,
} from '@/features/ask';
import { closePostSheet, hasPostDraft, useStartPost } from '@/features/bounty';
import { AskTapirSheet, isShellTab } from '@/features/shell';
import { deviceCurrency } from '@/lib/deviceCurrency';
import type { BountyDraft } from '@/lib/drafts/bountyDraft';
import { bountyDraftInbox } from '@/lib/drafts/inbox';
import { useI18n } from '@/lib/i18n';

export default function Ask() {
  const router = useRouter();
  const { t } = useI18n();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const userId = useSignedInUser()?.id ?? null;
  const consent = useConsentFor(userId);
  const state = useAskSession(userId);
  const [imageFailed, setImageFailed] = useState(false);
  const openConsent = useCallback(
    () => router.push({ pathname: '/ask-consent', params: { from: 'sheet' } }),
    [router],
  );
  const toForm = useRef(false);
  const startPost = useStartPost({
    open: () =>
      toForm.current || (userId !== null && hasPostDraft(userId))
        ? router.replace('/bounty-post/form', { withAnchor: true })
        : router.replace('/bounty-post'),
    pay: (paymentId) => {
      closePostSheet();
      router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
    },
  });
  const leaveFor = (form: boolean) => {
    toForm.current = form;
    void startPost();
  };
  const belly = useBellySlots({
    consent,
    session: state,
    onTomorrow: () => router.back(),
    onManual: () => leaveFor(false),
  });

  if (!userId || !state) return null;
  const sending = state.sending !== null;
  const note = state.needsUpdate
    ? t('ask.composer.needsUpdate')
    : imageFailed
      ? t('ask.sheet.imageFailed')
      : null;

  return (
    <AskTapirSheet
      tab={isShellTab(tab) ? tab : 'bounty'}
      onClose={() => router.back()}
      showSuggestions={state.turns.length === 0 && !sending && !belly.hungry}
      replies={state.turns.length + (state.failed ? 1 : 0) + (sending ? 1 : 0)}
      belly={belly.bar}
      notice={belly.notice}
      onSuggestion={(text) => askSession.setText(text)}
      composer={{
        text: state.text,
        onChangeText: (text) => {
          setImageFailed(false);
          askSession.setText(text);
        },
        onSend: () => void askSession.send(openConsent),
        onAddImage: async () => {
          setImageFailed(false);
          const picked = await pickScreenshot();
          if (picked.kind === 'picked') void askSession.sendImage(picked.image, openConsent);
          else setImageFailed(picked.kind === 'failed');
        },
        sending,
        note,
      }}
    >
      <AskConversation
        state={state}
        currency={deviceCurrency()}
        actions={{
          onResume: askSession.resume,
          onChoose: (answer) => void askSession.choose(answer, openConsent),
          onPick: askSession.pick,
          onFill: (draft: BountyDraft) => {
            bountyDraftInbox.put(userId, draft);
            leaveFor(true);
          },
          onRetry: () => void askSession.retry(openConsent),
          onManual: () => leaveFor(false),
        }}
        hungry={belly.hungry}
      />
    </AskTapirSheet>
  );
}

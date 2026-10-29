import { HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  foregroundStyle,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetFrame } from '@/ui/SheetFrame';
import { TaskCard } from '@/ui/TaskCard';

import { costLine, payTarget } from './cost';
import { CostSection } from './CostSection';
import { canPublish, type FlowState } from './postFlow';
import { draftStore } from './services';
import { useTimeLine } from './timeLine';
import type { PostDraft } from './types';
import { formError, useDraft } from './useDraft';
import { usePostFlow } from './usePostFlow';
import { parseReward } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

type ConfirmProps = {
  userId: string;
  onPublished: () => void;
  onPay: (paymentId: string) => void;
  onBack: () => void;
};

export function PostConfirm({ userId, onPublished, onPay, onBack }: ConfirmProps) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const current = useDraft(userId);
  const [draft, setDraft] = useState(current);
  if (current !== draft && !draftStore.isEmpty(current)) setDraft(current);
  const flow = usePostFlow(userId, {
    onPublished,
    onInvalid: (error) => {
      formError.set(error);
      onBack();
    },
    onAlreadySent: () => {
      formError.set('alreadySent');
      onBack();
    },
  });
  const { busy, rejected } = flow.state;

  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: !busy });
  }, [navigation, busy]);

  const status = flow.state.status;
  const unpaidMissing =
    status.kind === 'ready' && payTarget(costLine(status.status)) === null && status.status.blocked;
  const reloaded = useRef(false);
  useEffect(() => {
    if (!unpaidMissing || reloaded.current) return;
    reloaded.current = true;
    flow.retry();
  }, [unpaidMissing, flow]);

  const notice =
    rejected === 'failed' ? (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t('bounty.post.confirm.failed')}
        testID="bounty-post-failed"
      />
    ) : rejected === 'invalid' ? (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t('bounty.post.confirm.invalid.title')}
        action={{
          label: t('bounty.post.confirm.invalid.action'),
          onPress: onBack,
          testID: 'bounty-post-invalid-back',
        }}
        testID="bounty-post-invalid"
      />
    ) : null;

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: !busy, gestureEnabled: !busy }} />
      <SheetFrame notice={notice} testID="bounty-post-confirm">
        <Actions state={flow.state} onPublish={flow.publish} onPay={onPay} />
        <Preview draft={draft} />
        <CostSection state={flow.state.status} onRetry={flow.retry} />
      </SheetFrame>
    </>
  );
}

function Preview({ draft }: { draft: PostDraft }) {
  const { t, language } = useI18n();
  const time = useTimeLine(draft.time);
  const reward = parseReward(draft.rewardText, draft.currency);
  const firstLine = draft.description?.trim().split('\n')[0] ?? '';
  const place = draft.place?.label.trim() || null;
  const address = draft.place?.address?.trim() || null;
  if (!draft.category || reward === null) return null;
  const amount = formatMoney(reward, language, { whole: true });
  const meta = place && time ? t('bounty.post.confirm.meta', { place, time }) : (place ?? time);
  return (
    <>
      <Section>
        <TaskCard
          category={draft.category}
          title={draft.title.trim()}
          meta={meta}
          reward={amount}
          rewardLabel={t('bounty.post.confirm.rewardLabel', { amount })}
          testID="bounty-post-preview"
        />
      </Section>
      {time || firstLine || place ? (
        <Section
          footer={
            place && address ? (
              <Text modifiers={[accessibilityIdentifier('bounty-post-address-note')]}>
                {t('bounty.post.confirm.addressNote')}
              </Text>
            ) : undefined
          }
        >
          {place ? (
            <SummaryRow
              label={t('bounty.post.confirm.place')}
              value={place}
              testID="bounty-post-summary-place"
            />
          ) : null}
          {time ? (
            <SummaryRow
              label={t('bounty.post.confirm.time')}
              value={time}
              testID="bounty-post-time"
            />
          ) : null}
          {firstLine ? (
            <SummaryRow
              label={t('bounty.post.confirm.description')}
              value={firstLine}
              testID="bounty-post-summary-description"
            />
          ) : null}
        </Section>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <HStack modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}>
      <Text>{label}</Text>
      <Spacer />
      <Text modifiers={[secondary, lineLimit(1)]}>{value}</Text>
    </HStack>
  );
}

function Actions({
  state,
  onPublish,
  onPay,
}: {
  state: FlowState;
  onPublish: () => void;
  onPay: (paymentId: string) => void;
}) {
  const { t } = useI18n();
  const ready = state.status.kind === 'ready' ? state.status.status : null;
  const line = ready ? costLine(ready) : null;
  const target = line ? payTarget(line) : null;
  if (line?.kind === 'blocked') {
    return (
      <SheetActions>
        {target ? (
          <PillButton
            label={t('bounty.post.confirm.pay')}
            onPress={() => onPay(target)}
            testID="bounty-post-pay"
          />
        ) : null}
        <PillButton
          label={t('bounty.post.confirm.publish')}
          variant="plain"
          disabled
          onPress={onPublish}
          testID="bounty-post-publish"
        />
      </SheetActions>
    );
  }
  const label =
    line?.kind === 'none'
      ? t('bounty.post.confirm.needCoin')
      : line?.kind === 'coin'
        ? t('bounty.post.confirm.publishCoin')
        : t('bounty.post.confirm.publish');
  return (
    <SheetActions>
      <PillButton
        label={label}
        loading={state.busy}
        disabled={!state.busy && !canPublish(state)}
        onPress={onPublish}
        testID="bounty-post-publish"
      />
    </SheetActions>
  );
}

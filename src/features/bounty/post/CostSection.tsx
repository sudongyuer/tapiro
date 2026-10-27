import { HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { useTheme } from '@/ui/theme/useTheme';

import { blockedReason, ringgit } from './blockedReason';
import { costLine } from './cost';
import type { StatusState } from './postFlow';
import { malaysiaDate } from './timeText';
import type { CostBase, PostStatus } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

function CostRow({ value, urgent = false }: { value: string; urgent?: boolean }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <HStack
      modifiers={[accessibilityElement('combine'), accessibilityIdentifier('bounty-post-cost')]}
    >
      <Text>{t('bounty.post.confirm.fee')}</Text>
      <Spacer />
      <Text modifiers={[urgent ? foregroundStyle(color('--color-urgent')) : secondary]}>
        {value}
      </Text>
    </HStack>
  );
}

function BaseSection({ base, status }: { base: CostBase; status: PostStatus }) {
  const { t } = useI18n();
  const of = status.freePostsPerMonth;
  if (base.kind === 'free') {
    return (
      <Section footer={<Text>{t('bounty.post.cost.footer.free')}</Text>}>
        <CostRow value={t('bounty.post.cost.free', { left: base.left, of: base.of })} />
      </Section>
    );
  }
  if (base.kind === 'coin') {
    return (
      <Section footer={<Text>{t('bounty.post.cost.footer.coin', { of })}</Text>}>
        <CostRow value={t('bounty.post.cost.coin', { balance: base.balance })} />
      </Section>
    );
  }
  return (
    <Section footer={<Text>{t('bounty.post.cost.footer.none', { of })}</Text>}>
      <CostRow value={t('bounty.post.cost.coin', { balance: 0 })} urgent />
    </Section>
  );
}

function BlockedNotice({ status }: { status: PostStatus }) {
  const { t, language } = useI18n();
  const reason = blockedReason(status.unpaid, new Date(), t('bounty.post.unknownName'));
  const body =
    reason?.kind === 'many'
      ? t('bounty.post.blocked.many', {
          count: reason.unpaid.length,
          list: reason.unpaid
            .map((payment) =>
              t('bounty.post.blocked.item', {
                name: payment.payeeName,
                amount: ringgit(payment.amountSen, language),
              }),
            )
            .join(t('bounty.post.blocked.separator')),
        })
      : reason?.kind === 'old'
        ? t('bounty.post.blocked.old', {
            name: reason.payment.payeeName,
            amount: ringgit(reason.payment.amountSen, language),
            days: reason.days,
          })
        : undefined;
  return (
    <NoticeCard
      tone="warning"
      icon="exclamationmark.triangle.fill"
      title={t('bounty.post.blocked.title')}
      body={body}
      testID="bounty-post-blocked"
    />
  );
}

export function CostSection({ state, onRetry }: { state: StatusState; onRetry: () => void }) {
  const { t, language } = useI18n();
  if (state.kind === 'loading') {
    return (
      <Section>
        <CostRow value={t('bounty.post.cost.loading')} />
      </Section>
    );
  }
  if (state.kind === 'failed') {
    return (
      <NoticeCard
        tone="urgent"
        icon="wifi.exclamationmark"
        title={t('bounty.post.cost.loadFailed')}
        action={{
          label: t('bounty.post.cost.retry'),
          onPress: onRetry,
          testID: 'bounty-post-cost-retry',
        }}
        testID="bounty-post-cost-failed"
      />
    );
  }
  const { status } = state;
  const line = costLine(status);
  const base = costLine({ ...status, blocked: false }) as CostBase;
  return (
    <>
      {line.kind === 'blocked' ? <BlockedNotice status={status} /> : null}
      {base.kind === 'none' && line.kind !== 'blocked' ? (
        <NoticeCard
          tone="urgent"
          icon="circle.slash"
          title={t('bounty.post.noBalance.title')}
          body={`${t('bounty.post.noBalance.body', {
            date: malaysiaDate(status.nextFreeAt, language),
          })}\n${t('bounty.post.noBalance.earn')}`}
          testID="bounty-post-no-balance"
        />
      ) : null}
      <BaseSection base={base} status={status} />
    </>
  );
}

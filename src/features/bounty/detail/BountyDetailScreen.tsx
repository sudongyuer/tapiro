import { ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetFrame } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { malaysiaClock } from '../board/malaysiaClock';
import { detailCopy } from './detailCopy';
import { detailNotice } from '../apply/applyState';
import { useWithdraw } from '../apply/useApply';
import { BlockMenu } from '../block/BlockMenu';
import { useBlockPoster } from '../block/hooks';
import { AppliedActions } from './AppliedActions';
import { DetailDescription, DetailHeader, DetailInfo } from './DetailRows';
import { shownView, type DetailAction, type DetailView } from './detailState';
import { useDetail } from './useDetail';

type Props = {
  id: string;
  userId: string;
  onApply: (id: string) => void;
  onGone: () => void;
  onBlocked: () => void;
};

export function BountyDetailScreen({ id, userId, onApply, onGone, onBlocked }: Props) {
  const { t, language } = useI18n();
  const { state, retry } = useDetail(id, userId);
  const withdrawal = useWithdraw(id, () => void retry());
  const blocking = useBlockPoster(onBlocked);
  const loadedAt = state.kind === 'ready' ? state.loadedAt : null;
  const { loaded } = withdrawal;
  useEffect(() => {
    if (loadedAt) loaded();
  }, [loadedAt, loaded]);

  if (state.kind === 'gone') {
    return (
      <View style={styles.gone}>
        <InlineState
          text={t('bounty.detail.gone')}
          action={{ label: t('bounty.detail.back'), onPress: onGone, testID: 'bounty-detail-back' }}
          testID="bounty-detail-gone"
        />
      </View>
    );
  }

  const now = new Date();
  const view = shownView(state, now);
  const copy = view ? detailCopy(view, t, language, now) : null;
  const failed = state.kind === 'failed';
  const stale = state.kind === 'ready' && state.refreshFailed;
  const notice = detailNotice(stale, withdrawal.state);
  const retryAction = {
    label: t('bounty.detail.retry'),
    onPress: () => void retry(),
    testID: 'bounty-detail-retry',
    busyLabel:
      (state.kind === 'failed' && state.retrying) || (stale && state.refreshing)
        ? t('bounty.detail.loading')
        : undefined,
  };

  const poster = view && view.poster.id !== userId ? view.poster : null;

  return (
    <>
      <BlockMenu poster={poster} state={blocking.state} onAsk={blocking.ask} />
      <SheetFrame
        testID="bounty-detail"
        pinnedAbove="tabBar"
        notice={
          blocking.state === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('bounty.block.failed')}
              testID="bounty-detail-block-failed"
            />
          ) : notice === 'notPending' ? (
            <NoticeCard
              tone="warning"
              icon="exclamationmark.triangle.fill"
              title={t('bounty.detail.withdrawNotPending')}
              testID="bounty-detail-withdraw-stale"
            />
          ) : notice === 'stale' && state.kind === 'ready' ? (
            <NoticeCard
              tone="warning"
              icon="exclamationmark.triangle.fill"
              title={t('bounty.detail.refreshFailed', { time: malaysiaClock(state.loadedAt) })}
              action={retryAction}
              testID="bounty-detail-stale"
            />
          ) : null
        }
      >
        {view && copy ? <DetailHeader view={view} copy={copy} /> : null}
        {failed ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('bounty.detail.failed')}
            action={retryAction}
            testID="bounty-detail-failed"
          />
        ) : view && copy ? (
          <>
            <DetailInfo view={view} copy={copy} />
            <DetailDescription text={view.description} />
            <DetailActions
              view={view}
              name={copy.name}
              current={state.kind === 'ready'}
              onApply={() => onApply(id)}
              withdrawal={withdrawal}
            />
          </>
        ) : (
          <Section>
            <ProgressView
              modifiers={[
                accessibilityLabel(t('bounty.detail.loading')),
                accessibilityIdentifier('bounty-detail-loading'),
              ]}
            />
          </Section>
        )}
      </SheetFrame>
    </>
  );
}

const REASON: Partial<Record<DetailAction, 'bounty.detail.closed' | 'bounty.detail.taken'>> = {
  closed: 'bounty.detail.closed',
  taken: 'bounty.detail.taken',
};

function DetailActions({
  view,
  name,
  current,
  onApply,
  withdrawal,
}: {
  view: DetailView;
  name: string;
  current: boolean;
  onApply: () => void;
  withdrawal: ReturnType<typeof useWithdraw>;
}) {
  const { t } = useI18n();
  if (view.action === 'none') return null;
  if (view.action === 'applied') {
    return (
      <AppliedActions
        name={name}
        note={view.note}
        state={withdrawal.state}
        withdraw={withdrawal.withdraw}
      />
    );
  }
  const reason = REASON[view.action];
  return (
    <SheetActions>
      {reason ? (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          testID="bounty-detail-reason"
          style={styles.reason}
        >
          {t(reason)}
        </AppText>
      ) : null}
      <PillButton
        label={t('bounty.detail.apply')}
        loading={!current}
        disabled={reason !== undefined}
        onPress={onApply}
        testID="bounty-detail-apply"
      />
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  gone: {
    flex: 1,
    justifyContent: 'center',
    padding: vars['--space-4'],
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
  reason: { textAlign: 'center' },
});

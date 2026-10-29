import { ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { NoticeCard } from '@/ui/NoticeCard';
import { SheetFrame, SheetLayer } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { AddressSection } from '../shared/AddressSection';
import { addressView } from '../shared/exactAddress';
import { EtaSheet } from './EtaSheet';
import { PinnedActions, StatusMenu } from './StatusActions';
import { actionLocked } from './statusState';
import { statusClock } from './statusCopy';
import { StatusHeader, StatusTimeline } from './StatusTimeline';
import { counterpartName, statusActions, type StatusAction } from './timeline';
import { useHelperActions } from './useHelperActions';
import { useStatus } from './useStatus';

export type RoutedAction = Extract<StatusAction, 'confirm' | 'reportIssue' | 'cancel'>;

export type StatusScreenProps = {
  id: string;
  onBack: () => void;
  onPay: (paymentId: string) => void;
  onAction?: (action: RoutedAction) => void;
};

export function StatusScreen({ id, onBack, onPay, onAction }: StatusScreenProps) {
  const { t, language } = useI18n();
  const { state, refresh, act } = useStatus(id);
  const helper = useHelperActions(id, act);
  const { load, action } = state;

  if (load.kind === 'failed' && load.reason === 'unavailable') {
    return (
      <View style={styles.gone}>
        <InlineState
          text={t('bounty.detail.gone')}
          action={{ label: t('bounty.detail.back'), onPress: onBack, testID: 'bounty-status-back' }}
          testID="bounty-status-gone"
        />
      </View>
    );
  }

  const detail = load.kind === 'ready' ? load.detail : null;
  const role = detail?.viewerRole ?? 'poster';
  const actions = detail ? statusActions(detail, role) : { pinned: [], menu: [] };
  const run = (chosen: StatusAction) => {
    if (!detail) return;
    switch (chosen) {
      case 'start':
        return helper.openEta('start', detail);
      case 'changeEta':
        return helper.openEta('change', detail);
      case 'complete':
      case 'completeAgain':
        return void helper.complete(chosen);
      case 'pay':
        if (detail.payment) onPay(detail.payment.id);
        return;
      case 'confirm':
      case 'reportIssue':
      case 'cancel':
        return onAction?.(chosen);
    }
  };
  const retry = (busy: boolean) => ({
    label: t('bounty.status.retry'),
    onPress: () => void refresh(),
    testID: 'bounty-status-retry',
    busyLabel: busy ? t('bounty.status.loading') : undefined,
  });

  return (
    <>
      <StatusMenu actions={actions.menu} role={role} locked={actionLocked(action)} onAction={run} />
      <SheetFrame
        testID="bounty-status"
        pinnedAbove="tabBar"
        scrollsUnderActions
        onRefresh={refresh}
        notice={
          <>
            {action.kind === 'changed' ? (
              <NoticeCard
                tone="warning"
                icon="arrow.triangle.2.circlepath"
                title={t('bounty.status.stateChanged')}
                testID="bounty-status-changed"
              />
            ) : null}
            {load.kind === 'ready' && load.refreshFailed ? (
              <NoticeCard
                tone="warning"
                icon="exclamationmark.triangle.fill"
                title={t('bounty.status.refreshFailed', {
                  time: statusClock(load.loadedAt, { t, language, now: new Date() }),
                })}
                action={retry(load.refreshing)}
                testID="bounty-status-stale"
              />
            ) : null}
          </>
        }
      >
        {load.kind === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('bounty.status.loadFailed')}
            action={retry(load.retrying)}
            testID="bounty-status-load-failed"
          />
        ) : detail ? (
          <>
            <StatusHeader detail={detail} />
            <StatusTimeline detail={detail} now={new Date()} />
            <AddressSection
              address={addressView({ kind: 'ready', detail })}
              name={counterpartName(detail, role)}
              testID="bounty-status-address"
            />
            <PinnedActions actions={actions.pinned} role={role} state={action} onAction={run} />
            <SheetLayer>
              <EtaSheet
                request={helper.eta.request}
                open={helper.eta.open}
                name={detail.poster.name ?? t('bounty.post.unknownName')}
                onConfirm={helper.confirmEta}
                onClose={helper.closeEta}
              />
            </SheetLayer>
          </>
        ) : (
          <Section>
            <ProgressView
              modifiers={[
                accessibilityLabel(t('bounty.status.loading')),
                accessibilityIdentifier('bounty-status-loading'),
              ]}
            />
          </Section>
        )}
      </SheetFrame>
    </>
  );
}

const styles = StyleSheet.create({
  gone: {
    flex: 1,
    justifyContent: 'center',
    padding: vars['--space-4'],
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
});

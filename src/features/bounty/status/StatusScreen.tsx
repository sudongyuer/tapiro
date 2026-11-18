import { ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useLiveOffline } from '@/lib/live';
import type { ConfirmAnchor } from '@/ui/confirm';
import { InlineState } from '@/ui/InlineState';
import { OfflineSection } from '@/ui/OfflineLine';
import { SheetFrame, SheetLayer } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { AddressSection } from '../shared/AddressSection';
import { addressView } from '../shared/exactAddress';
import { StateRow } from '../shared/StateRow';
import { EtaSheet } from './EtaSheet';
import { IssueSheet } from './IssueSheet';
import { PinnedActions, StatusMenu, type StatusMessage } from './StatusActions';
import { statusClock } from './statusCopy';
import { StatusHeader, StatusTimeline } from './StatusTimeline';
import { counterpartName, hasThread, statusActions, type StatusAction } from './timeline';
import { useHelperActions } from './useHelperActions';
import { usePosterActions } from './usePosterActions';
import { useStatus } from './useStatus';

export type StatusScreenProps = {
  id: string;
  onBack: () => void;
  onPay: (paymentId: string) => void;
  message?: StatusMessage;
  reviews?: (title: string) => ReactNode;
  onPull?: () => void;
};

export function StatusScreen({ id, onBack, onPay, message, reviews, onPull }: StatusScreenProps) {
  const { t, language } = useI18n();
  const { state, refresh, act } = useStatus(id);
  const helper = useHelperActions(id, act);
  const poster = usePosterActions(id, act, onPay);
  const { load, action } = state;
  const offline = useLiveOffline();

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
  const run = (chosen: StatusAction, anchor: ConfirmAnchor) => {
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
        return void poster.confirm(detail, anchor);
      case 'reportIssue':
        return poster.issue.show();
      case 'cancel':
        return void poster.cancel(detail, anchor);
    }
  };
  const retry = (busy: boolean) => ({
    label: t('bounty.status.retry'),
    onPress: () => void refresh(),
    testID: 'bounty-status-retry',
    busy,
  });

  return (
    <>
      <StatusMenu
        actions={actions.menu}
        role={role}
        state={action}
        onAction={(chosen) => run(chosen, 'bar')}
      />
      <SheetFrame
        testID="bounty-status"
        onRefresh={async () => {
          onPull?.();
          await refresh();
        }}
        notice={
          <>
            {offline ? (
              <OfflineSection text={t('live.offline')} testID="bounty-status-offline" />
            ) : null}
            {action.kind === 'changed' ? (
              <StateRow>
                <InlineState
                  tone="warning"
                  text={t('bounty.status.stateChanged')}
                  testID="bounty-status-changed"
                />
              </StateRow>
            ) : null}
            {load.kind === 'ready' && load.refreshFailed ? (
              <StateRow>
                <InlineState
                  tone="warning"
                  text={t('bounty.status.refreshFailed', {
                    time: statusClock(load.loadedAt, { t, language, now: new Date() }),
                  })}
                  action={retry(load.refreshing)}
                  testID="bounty-status-stale"
                />
              </StateRow>
            ) : null}
          </>
        }
      >
        {load.kind === 'failed' ? (
          <StateRow>
            <InlineState
              text={t('bounty.status.loadFailed')}
              action={retry(load.retrying)}
              testID="bounty-status-load-failed"
            />
          </StateRow>
        ) : detail ? (
          <>
            <StatusHeader detail={detail} />
            {detail.status === 'settled' ? reviews?.(detail.title) : null}
            <StatusTimeline detail={detail} now={new Date()} />
            {detail.status === 'cancelled' ? null : (
              <AddressSection
                address={addressView({ kind: 'ready', detail })}
                name={counterpartName(detail, role)}
                testID="bounty-status-address"
              />
            )}
            <PinnedActions
              actions={actions.pinned}
              role={role}
              state={action}
              message={message && hasThread(detail) ? message : null}
              onAction={run}
            />
            <SheetLayer>
              <EtaSheet
                request={helper.eta.request}
                open={helper.eta.open}
                name={detail.poster.name ?? t('bounty.post.unknownName')}
                onConfirm={helper.confirmEta}
                onClose={helper.closeEta}
              />
              <IssueSheet
                bountyId={id}
                open={poster.issue.open}
                name={counterpartName(detail, role) ?? t('bounty.post.unknownName')}
                onSend={(reason) => void poster.issue.send(reason)}
                onClose={poster.issue.close}
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

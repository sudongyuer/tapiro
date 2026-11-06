import { Form, Host, ProgressView, Section } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  refreshable,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { useTheme } from '@/ui/theme/useTheme';

import { useCoinsReadFailed, useInvite } from '../hooks';
import type { RedeemFailure } from '../types';
import { coinsStore } from '../services';
import { InvitedSection, MyCodeSection, RedeemedSection } from './InviteSections';
import { RedeemSection } from './RedeemSection';

const LATE: readonly RedeemFailure[] = ['alreadyRedeemed', 'tooLate'];

export function InviteScreen() {
  const { t } = useI18n();
  const { color } = useTheme();
  const { invite, redeem } = useInvite();
  const readFailed = useCoinsReadFailed('invite');
  const data = invite.status === 'idle' ? null : invite.data;
  const codeMissing = invite.status === 'ready' && data !== null && data.code === null;
  useEffect(() => {
    if (codeMissing) void coinsStore.reloadInvite();
  }, [codeMissing]);
  useEffect(() => {
    coinsStore.dismissRedeemFailure();
    return () => coinsStore.dismissRedeemFailure();
  }, []);
  const refused =
    data && !data.canRedeem && redeem.phase === 'failed' && LATE.includes(redeem.failure)
      ? t(`coins.invite.error.${redeem.failure}`)
      : null;
  useEffect(() => {
    if (refused) AccessibilityInfo.announceForAccessibility(refused);
  }, [refused]);
  const retry = (testID: string) => ({
    label: t('coins.retry'),
    onPress: () => void coinsStore.reloadInvite(),
    testID,
  });
  return (
    <Host style={styles.host} testID="invite-screen">
      <Form
        modifiers={[tint(color('--color-accent')), refreshable(() => coinsStore.reloadInvite())]}
      >
        {invite.status === 'stale' && readFailed && data ? (
          <NoticeCard
            tone="warning"
            icon="exclamationmark.triangle.fill"
            title={t('coins.invite.stale')}
            action={retry('invite-stale-retry')}
            testID="invite-stale"
          />
        ) : null}
        {refused ? (
          <NoticeCard
            tone="warning"
            icon="exclamationmark.triangle.fill"
            title={refused}
            testID="invite-refused"
          />
        ) : null}
        {data ? (
          <>
            <MyCodeSection code={data.code} reward={data.reward} />
            {data.canRedeem ? (
              <RedeemSection redeem={redeem} />
            ) : data.redeemed ? (
              <RedeemedSection redeemed={data.redeemed} reward={data.reward} />
            ) : null}
            <InvitedSection invited={data.invited} reward={data.reward} />
          </>
        ) : invite.status === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('coins.failed')}
            action={retry('invite-retry')}
            testID="invite-failed"
          />
        ) : (
          <Section>
            <ProgressView
              modifiers={[
                accessibilityLabel(t('coins.invite.loading')),
                accessibilityIdentifier('invite-loading'),
              ]}
            />
          </Section>
        )}
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

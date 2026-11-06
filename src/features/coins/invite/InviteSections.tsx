import { HStack, ProgressView, RNHostView, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  kerning,
  layoutPriority,
  lineLimit,
  multilineTextAlignment,
  textSelection,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { uiVerifyArgument } from '@/lib/uiVerify';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { inviteDevice } from '../services';
import type { Invite, InvitedFriend } from '../types';
import { personLabel, shareText, spelled } from './inviteView';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const COPIED_MS = Number(uiVerifyArgument('uiVerifyCopiedMs')) || 2000;
const wide = frame({ maxWidth: Infinity });

export function MyCodeSection({ code, reward }: { code: string | null; reward: number }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Section
      footer={
        <Text modifiers={[accessibilityIdentifier('invite-explain')]}>
          {t('coins.invite.explain', { reward })}
        </Text>
      }
    >
      <VStack spacing={vars['--space-3']} modifiers={[wide]}>
        {code ? (
          <VStack
            spacing={vars['--space-1']}
            modifiers={[
              accessibilityElement('ignore'),
              accessibilityLabel(t('coins.invite.codeA11y', { code: spelled(code) })),
              accessibilityIdentifier('invite-code'),
            ]}
          >
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
              {t('coins.invite.myCode')}
            </Text>
            <Text
              modifiers={[
                font({ textStyle: 'largeTitle', weight: 'bold', design: 'monospaced' }),
                kerning(vars['--space-1']),
                textSelection(true),
              ]}
            >
              {code}
            </Text>
          </VStack>
        ) : (
          <ProgressView
            modifiers={[
              accessibilityLabel(t('coins.invite.loading')),
              accessibilityIdentifier('invite-code-loading'),
            ]}
          />
        )}
        <RNHostView matchContents={{ vertical: true }}>
          <View style={styles.actions}>
            <View style={styles.action}>
              <PillButton
                label={copied ? t('coins.invite.copied') : t('coins.invite.copy')}
                variant="secondary"
                disabled={!code}
                onPress={async () => {
                  if (code && (await inviteDevice.copy(code))) setCopied(true);
                }}
                testID="invite-copy"
              />
            </View>
            <View style={styles.action}>
              <PillButton
                label={t('coins.invite.share')}
                disabled={!code}
                onPress={() => {
                  if (code) void inviteDevice.share(shareText(code, reward, t));
                }}
                testID="invite-share"
              />
            </View>
          </View>
        </RNHostView>
      </VStack>
    </Section>
  );
}

function StatusRow({ name, status, testID }: { name: string; status: string; testID: string }) {
  const { t } = useI18n();
  return (
    <HStack
      spacing={vars['--space-2']}
      modifiers={[
        accessibilityElement('ignore'),
        accessibilityLabel([name, status].join(t('coins.listJoin'))),
        accessibilityIdentifier(testID),
      ]}
    >
      <Text modifiers={[lineLimit(1), truncationMode('tail')]}>{name}</Text>
      <Spacer />
      <Text
        modifiers={[
          font({ textStyle: 'subheadline' }),
          secondary,
          layoutPriority(1),
          multilineTextAlignment('trailing'),
        ]}
      >
        {status}
      </Text>
    </HStack>
  );
}

const statusText = (rewarded: boolean, reward: number, t: ReturnType<typeof useI18n>['t']) =>
  rewarded ? t('coins.invite.rewarded', { reward }) : t('coins.invite.waiting');

export function RedeemedSection({
  redeemed,
  reward,
}: {
  redeemed: NonNullable<Invite['redeemed']>;
  reward: number;
}) {
  const { t } = useI18n();
  const name = t('coins.invite.redeemedRow', { name: personLabel(redeemed.inviter, t) });
  const status = t('coins.invite.redeemedStatus', {
    code: redeemed.code,
    status: statusText(redeemed.rewarded, reward, t),
  });
  return (
    <Section title={t('coins.invite.redeemedTitle')}>
      <StatusRow name={name} status={status} testID="invite-redeemed" />
    </Section>
  );
}

export function InvitedSection({ invited, reward }: { invited: InvitedFriend[]; reward: number }) {
  const { t } = useI18n();
  if (invited.length === 0) return null;
  return (
    <Section title={t('coins.invite.invited')}>
      {invited.map((friend, index) => (
        <StatusRow
          key={friend.person?.id ?? `gone-${index}`}
          name={personLabel(friend.person, t)}
          status={statusText(friend.rewardedAt !== null, reward, t)}
          testID={`invite-friend-${index}`}
        />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { width: '48%' },
});

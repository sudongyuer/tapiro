import { Form, HStack, Host, ProgressView, Section, Spacer, Text, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { bellyOf, consentAccess, type ConsentState } from './consentStore';
import { useConsentFor, usePantry } from './hooks';
import { PantrySection } from './PantrySection';
import { consentStore } from './services';

export function consentDate(acceptedAt: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(acceptedAt));
}

export function TapirSettingsScreen({
  userId,
  onOpenConsent,
}: {
  userId: string | null;
  onOpenConsent: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const state = useConsentFor(userId);
  const pantry = usePantry();
  const status = state.status;
  const belly = bellyOf(state);
  const retry = {
    label: t('ask.settings.retry'),
    onPress: () => void consentStore.refresh(),
    testID: 'tapir-settings-retry',
  };

  return (
    <Host style={styles.host} testID="tapir-settings-screen">
      <Form modifiers={[tint(color('--color-accent'))]}>
        {status.status === 'loading' && !status.data ? (
          <Section>
            <ProgressView
              modifiers={[
                frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] }),
                accessibilityLabel(t('ask.settings.loading')),
                accessibilityIdentifier('tapir-settings-loading'),
              ]}
            />
          </Section>
        ) : null}
        {status.status === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('ask.settings.failed')}
            action={retry}
            testID="tapir-settings-failed"
          />
        ) : null}
        {status.status === 'stale' ? (
          <NoticeCard
            tone="warning"
            icon="exclamationmark.triangle.fill"
            title={t('ask.settings.stale')}
            action={retry}
            testID="tapir-settings-stale"
          />
        ) : null}
        {state.failure?.write === 'withdraw' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('ask.settings.withdrawFailed')}
            testID="tapir-settings-withdraw-failed"
          />
        ) : null}
        {status.status !== 'idle' && status.data ? (
          <CloudSection state={state} onOpenConsent={onOpenConsent} />
        ) : null}
        {belly ? <PantrySection belly={belly} pantry={pantry} /> : null}
        {status.status !== 'idle' && status.data && !belly ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('ask.settings.failed')}
            action={{ ...retry, testID: 'tapir-pantry-retry' }}
            testID="tapir-pantry-failed"
          />
        ) : null}
      </Form>
    </Host>
  );
}

function CloudSection({
  state,
  onOpenConsent,
}: {
  state: ConsentState;
  onOpenConsent: () => void;
}) {
  const { t, language } = useI18n();
  const [flips, setFlips] = useState(0);
  const access = consentAccess(state);
  const data = state.status.status === 'idle' ? null : state.status.data;
  const footer =
    access === 'given' && data?.acceptedAt
      ? t('ask.settings.givenFooter', {
          provider: t('ask.provider'),
          date: consentDate(data.acceptedAt, language),
        })
      : access === 'needsUpdate'
        ? t('ask.settings.needsUpdateFooter')
        : t('ask.settings.offFooter');

  const onChange = (on: boolean) => {
    setFlips((count) => count + 1);
    if (on) onOpenConsent();
    else void consentStore.withdraw();
  };

  return (
    <Section
      footer={<Text modifiers={[accessibilityIdentifier('tapir-cloud-footer')]}>{footer}</Text>}
    >
      {state.writing === 'withdraw' ? (
        <HStack
          modifiers={[
            frame({ minHeight: vars['--touch-min'] }),
            accessibilityElement('combine'),
            accessibilityIdentifier('tapir-cloud-withdrawing'),
          ]}
        >
          <Text>{t('ask.settings.cloud')}</Text>
          <Spacer />
          <ProgressView modifiers={[accessibilityLabel(t('ask.settings.withdrawing'))]} />
        </HStack>
      ) : (
        <Toggle
          key={`cloud-${access}-${flips}`}
          label={t('ask.settings.cloud')}
          isOn={access === 'given'}
          onIsOnChange={onChange}
          testID="tapir-cloud"
          modifiers={[disabled(access === 'needsUpdate' || state.writing !== null)]}
        />
      )}
    </Section>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

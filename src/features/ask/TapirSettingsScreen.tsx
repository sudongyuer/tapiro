import {
  Button,
  Form,
  HStack,
  Host,
  Image,
  ProgressView,
  Section,
  Spacer,
  Text,
  Toggle,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  foregroundStyle,
  frame,
  hidden,
  labelsHidden,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { PlatformColor, StyleSheet } from 'react-native';
import { navigationScrollEdge } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { bellyOf, consentAccess, type ConsentState } from './consentStore';
import { useConsentFor, useMemoryFor, usePantry } from './hooks';
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
  onOpenMemory,
}: {
  userId: string | null;
  onOpenConsent: () => void;
  onOpenMemory: () => void;
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
      <Form modifiers={[navigationScrollEdge(), tint(color('--color-accent'))]}>
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
        <MemoryRow userId={userId} onPress={onOpenMemory} />
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
            accessibilityElement('combine'),
            accessibilityIdentifier('tapir-cloud-withdrawing'),
          ]}
        >
          <Text>{t('ask.settings.cloud')}</Text>
          <Spacer />
          {/* A hidden switch with no height keeps the switch's width, so the label wraps as it does beside the switch
          (ms) and the row keeps the spinner's height (zh-Hans); the rows below stay put. */}
          <ZStack>
            <Toggle
              isOn
              modifiers={[labelsHidden(), frame({ height: 0 }), hidden(), accessibilityHidden()]}
            />
            <ProgressView modifiers={[accessibilityLabel(t('ask.settings.withdrawing'))]} />
          </ZStack>
        </HStack>
      ) : (
        <Toggle
          key={`cloud-${access}-${flips}`}
          label={t('ask.settings.cloud')}
          isOn={access === 'given'}
          onIsOnChange={onChange}
          testID="tapir-cloud"
          modifiers={[
            tint(PlatformColor('systemGreen')),
            disabled(access === 'needsUpdate' || state.writing !== null),
          ]}
        />
      )}
    </Section>
  );
}

function MemoryRow({ userId, onPress }: { userId: string | null; onPress: () => void }) {
  const { t } = useI18n();
  const memory = useMemoryFor(userId);
  const count = memory?.data ? t('ask.memory.count', { count: memory.data.entries.length }) : null;
  return (
    <Section>
      <Button onPress={onPress} testID="tapir-memory-row">
        <HStack
          modifiers={[
            accessibilityElement('combine'),
            accessibilityLabel(
              count ? `${t('ask.memory.title')}, ${count}` : t('ask.memory.title'),
            ),
          ]}
        >
          <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
            {t('ask.memory.title')}
          </Text>
          <Spacer />
          {count ? (
            <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
              {count}
            </Text>
          ) : null}
          <Image
            systemName="chevron.right"
            size={14}
            modifiers={[
              foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
              accessibilityHidden(),
            ]}
          />
        </HStack>
      </Button>
    </Section>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

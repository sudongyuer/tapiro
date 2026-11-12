import { Button, LabeledContent, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { Mascot } from '@/ui/Mascot';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetFrame } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { useConsentState } from './hooks';
import { splitBold } from './splitBold';
import { consentAccess } from './consentStore';
import { consentStore } from './services';

const MASCOT = 56;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export type ConsentFrom = 'sheet' | 'me' | 'chat';

export function ConsentScreen({
  from,
  onDone,
  onOpenPrivacy,
}: {
  from: ConsentFrom;
  onDone: () => void;
  onOpenPrivacy: () => void;
}) {
  const { t } = useI18n();
  const state = useConsentState();
  const access = consentAccess(state);
  const needsUpdate = access === 'needsUpdate' || state.failure?.reason === 'needsUpdate';
  const failed = state.failure?.write === 'record' && state.failure.reason === 'failed';
  const recording = state.writing === 'record';

  const [token] = useState(() => consentStore.pendingAsk());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    consentStore.dismissFailure();
    return () => {
      mounted.current = false;
      if (token !== null) consentStore.decline(token);
    };
  }, [token]);

  const agree = async () => {
    if ((await consentStore.record()) && mounted.current) onDone();
  };
  const decline = () => {
    if (token !== null) consentStore.decline(token);
    onDone();
  };

  const notice = needsUpdate ? (
    <NoticeCard
      tone="warning"
      icon="arrow.down.app.fill"
      title={t('ask.consent.needsUpdate')}
      testID="ask-consent-needs-update"
    />
  ) : failed ? (
    <NoticeCard
      tone="urgent"
      icon="exclamationmark.circle.fill"
      title={t('ask.consent.failed')}
      testID="ask-consent-failed"
    />
  ) : null;

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !recording }} />
      <SheetFrame notice={notice} testID="ask-consent-screen">
        <SheetActions>
          <View style={styles.actions}>
            {needsUpdate ? (
              <PillButton
                label={t('ask.consent.close')}
                onPress={decline}
                testID="ask-consent-close"
              />
            ) : (
              <>
                <PillButton
                  label={t('ask.consent.agree')}
                  loading={recording}
                  loadingLabel={t('ask.consent.agreeing')}
                  onPress={() => void agree()}
                  testID="ask-consent-agree"
                />
                <PillButton
                  variant="plain"
                  label={t(from === 'sheet' ? 'ask.consent.decline' : 'ask.consent.declineFromMe')}
                  disabled={recording}
                  onPress={decline}
                  testID="ask-consent-decline"
                />
              </>
            )}
          </View>
        </SheetActions>
        <Header />
        <Section
          footer={
            <Text modifiers={[accessibilityIdentifier('ask-consent-withdraw')]}>
              {t('ask.consent.withdraw')}
            </Text>
          }
        >
          <Fact label={t('ask.consent.sendsLabel')} value={t('ask.consent.sends')} id="sends" />
          <Fact label={t('ask.consent.neverLabel')} value={t('ask.consent.never')} id="never" />
          <Fact label={t('ask.consent.keptLabel')} value={t('ask.consent.kept')} id="kept" />
        </Section>
        <Section>
          <Button
            label={t('ask.consent.privacy')}
            systemImage="hand.raised.fill"
            onPress={onOpenPrivacy}
            testID="ask-consent-privacy"
          />
        </Section>
      </SheetFrame>
    </>
  );
}

function Header() {
  const { t } = useI18n();
  const body = t('ask.consent.body', { provider: t('ask.provider') });
  const parts = splitBold(body);
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack spacing={vars['--space-3']} modifiers={[frame({ maxWidth: Infinity })]}>
        <RNHostView matchContents>
          <Mascot variant="front" size={MASCOT} />
        </RNHostView>
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
            multilineTextAlignment('center'),
            accessibilityAddTraits(['isHeader']),
            accessibilityIdentifier('ask-consent-title'),
          ]}
        >
          {t('ask.consent.title')}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: 'body' }),
            multilineTextAlignment('center'),
            accessibilityIdentifier('ask-consent-body'),
          ]}
        >
          {parts ? (
            <>
              {parts.before}
              <Text modifiers={[font({ textStyle: 'body', weight: 'bold' })]}>{parts.bold}</Text>
              {parts.after}
            </>
          ) : (
            body
          )}
        </Text>
      </VStack>
    </Section>
  );
}

function Fact({ label, value, id }: { label: string; value: string; id: string }) {
  return (
    <LabeledContent
      label={label}
      modifiers={[accessibilityElement('combine'), accessibilityIdentifier(`ask-consent-${id}`)]}
    >
      <Text modifiers={[secondary, multilineTextAlignment('trailing')]}>{value}</Text>
    </LabeledContent>
  );
}

const styles = StyleSheet.create({ actions: { gap: vars['--space-2'] } });

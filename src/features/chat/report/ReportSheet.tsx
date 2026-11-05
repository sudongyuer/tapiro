import { Form, Host, HStack, Picker, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, StyleSheet } from 'react-native';

import { useBlockPerson } from '@/features/block';
import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useChatMessage, useChatThreadInfo } from '../hooks';
import { chatStore } from '../services';
import { blockKind } from '../thread/safetyView';
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from '../types';
import { canSubmit, noteCount, reportInput, type ReportPhase } from './reportForm';
import { messageText } from '../messageText';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function ReportSheet({
  threadId,
  userId,
  messageId,
  onClose,
}: {
  threadId: string;
  userId: string;
  messageId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const info = useChatThreadInfo(threadId);
  const member = info?.members.find((one) => one.id === userId) ?? null;
  const name = member?.name ?? t('chat.list.someone');
  const quoted = useChatMessage(threadId, messageId);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<ReportPhase>('form');
  const note = useSyncedText('', setTyped);
  const blocking = useBlockPerson('threadPeer');
  const busy = phase === 'sending' || blocking.state === 'busy';
  const count = noteCount(typed);

  const offerBlock = () => {
    if (!info || !member || member.blockedByMe) {
      Alert.alert(t('chat.thread.reported'), undefined, [
        { text: t('chat.thread.ok'), onPress: onClose },
      ]);
      return;
    }
    blocking.ask(
      { id: member.id, name: member.name },
      {
        kind: blockKind(info, member),
        title: t('chat.report.offerBlock', { name }),
        onSettled: (outcome) => {
          if (outcome !== 'failed') return onClose();
          Alert.alert(t('chat.report.blockFailed'), undefined, [
            { text: t('chat.thread.ok'), onPress: onClose },
          ]);
        },
      },
    );
  };

  const submit = () => {
    const text = note.sync();
    if (!reason || !canSubmit(reason, text, phase)) return;
    // The Form's collection view aborts when it rebuilds rows while the note field is first responder.
    Keyboard.dismiss();
    setPhase('sending');
    chatStore
      .report(reportInput({ userId, messageId }, reason, text))
      .then(() => {
        setPhase('sent');
        offerBlock();
      })
      .catch(() => setPhase('failed'));
  };

  return (
    <>
      <Stack.Screen
        options={{ title: t('chat.report.title'), gestureEnabled: !busy && phase !== 'sent' }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button disabled={busy} onPress={onClose}>
          {t('chat.report.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {busy ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View>
            <ActivityIndicator
              accessible
              accessibilityLabel={t('chat.report.sending')}
              testID="chat-report-sending"
              style={styles.busy}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            variant="prominent"
            tintColor={color('--color-accent')}
            disabled={!canSubmit(reason, typed, phase)}
            onPress={submit}
          >
            {t('chat.report.submit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Host style={styles.host} testID="chat-report">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {phase === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('chat.report.failed')}
              testID="chat-report-failed"
            />
          ) : null}
          {quoted ? (
            <Section title={t('chat.report.message')}>
              <Text modifiers={[lineLimit(3), accessibilityIdentifier('chat-report-quote')]}>
                {messageText(quoted.body, quoted.image !== null, t)}
              </Text>
            </Section>
          ) : null}
          <Section
            title={t('chat.report.reasons', { name })}
            footer={<Text>{t('chat.report.footer', { name })}</Text>}
          >
            <Picker<ReportReason | null>
              selection={reason}
              onSelectionChange={(next) => setReason(next)}
              modifiers={[pickerStyle('inline'), disabled(busy || phase === 'sent')]}
            >
              {REPORT_REASONS.map((option) => (
                <Text key={option} modifiers={[tag(option)]}>
                  {t(`chat.report.reason.${option}`)}
                </Text>
              ))}
            </Picker>
          </Section>
          <Section>
            <SyncedTextField
              field={note}
              axis="vertical"
              maxLength={REPORT_NOTE_MAX}
              placeholder={t('chat.report.note')}
              testID="chat-report-note"
              modifiers={[
                lineLimit({ min: 3, max: 6 }),
                accessibilityLabel(t('chat.report.note')),
                disabled(busy || phase === 'sent'),
              ]}
            />
            <HStack spacing={0}>
              <Spacer />
              <Text
                modifiers={[
                  count > REPORT_NOTE_MAX ? foregroundStyle(color('--color-urgent')) : secondary,
                  monospacedDigit(),
                  accessibilityLabel(t('chat.report.countLabel', { count, max: REPORT_NOTE_MAX })),
                  accessibilityIdentifier('chat-report-count'),
                ]}
              >
                {t('chat.report.count', { count, max: REPORT_NOTE_MAX })}
              </Text>
            </HStack>
          </Section>
        </Form>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});

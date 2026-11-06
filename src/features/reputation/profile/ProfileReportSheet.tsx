import { Form, Host, HStack, Picker, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
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
import {
  canSubmit,
  cleanNote,
  noteCount,
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  type ReportPhase,
  type ReportReason,
} from '@/lib/report';
import { NoticeCard } from '@/ui/NoticeCard';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useProfile } from '../hooks';
import { profileStore } from '../services';
import { personName } from './profileView';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function ProfileReportSheet({
  personId,
  onClose,
}: {
  personId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const card = useProfile(personId);
  const person = card.status === 'idle' ? null : card.data;
  const name = personName(person?.name ?? null, t);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<ReportPhase>('form');
  const note = useSyncedText('', setTyped);
  const blocking = useBlockPerson('poster');
  const busy = phase === 'sending' || blocking.state === 'busy';
  const count = noteCount(typed);

  const offerBlock = () => {
    if (!person || person.blockedByMe) {
      Alert.alert(t('chat.thread.reported'), undefined, [
        { text: t('chat.thread.ok'), onPress: onClose },
      ]);
      return;
    }
    blocking.ask(
      { id: person.id, name: person.name },
      {
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
    profileStore
      .report(personId, reason, cleanNote(text))
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
              testID="profile-report-sending"
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
      <Host style={styles.host} testID="profile-report">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {phase === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('chat.report.failed')}
              testID="profile-report-failed"
            />
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
              testID="profile-report-note"
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

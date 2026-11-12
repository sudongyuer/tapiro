import { Linking, PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import type { VoiceNote, VoiceState } from './voice';

const NOTE_KEYS = {
  noSpeech: 'ask.voice.note.noSpeech',
  micFailed: 'ask.voice.note.micFailed',
  failed: 'ask.voice.note.failed',
  offline: 'ask.voice.note.offline',
  hungry: 'ask.voice.note.hungry',
  busy: 'ask.voice.note.busy',
  declined: 'ask.voice.note.declined',
  needsUpdate: 'ask.composer.needsUpdate',
  unreadable: 'ask.voice.note.unreadable',
} as const satisfies Record<VoiceNote, string>;

function Card({
  title,
  body,
  button,
  onPress,
  testID,
}: {
  title: string;
  body: string;
  button: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <View
      style={[styles.card, { borderColor: PlatformColor('separator') }]}
      testID={testID}
      accessible={false}
    >
      <AppText variant="title" testID={`${testID}-title`}>
        {title}
      </AppText>
      <AppText variant="secondary" tone="secondaryLabel" testID={`${testID}-body`}>
        {body}
      </AppText>
      <View style={styles.button}>
        <PillButton label={button} onPress={onPress} testID={`${testID}-button`} />
      </View>
    </View>
  );
}

export function VoiceCards({
  state,
  onAllow,
  onRetry,
}: {
  state: VoiceState;
  onAllow: () => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  if (state.phase === 'explain') {
    return (
      <Card
        title={t('ask.voice.explainTitle')}
        body={t('ask.voice.explainBody')}
        button={t('ask.voice.explainOk')}
        onPress={onAllow}
        testID="ask-voice-explain"
      />
    );
  }
  if (state.phase === 'blocked') {
    return (
      <Card
        title={t('ask.voice.blockedTitle')}
        body={t('ask.voice.blockedBody')}
        button={t('ask.voice.openSettings')}
        onPress={() => void Linking.openSettings()}
        testID="ask-voice-blocked"
      />
    );
  }
  if (!state.note) return null;
  return (
    <View style={styles.note} testID="ask-voice-note">
      <AppText variant="secondary" testID="ask-voice-note-text">
        {t(NOTE_KEYS[state.note])}
      </AppText>
      {state.canRetry ? (
        <View style={styles.button}>
          <PillButton
            label={t('ask.voice.retry')}
            variant="secondary"
            onPress={onRetry}
            testID="ask-voice-retry"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: vars['--space-2'],
    padding: vars['--space-4'],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  note: { gap: vars['--space-2'] },
  button: { alignSelf: 'flex-start' },
});

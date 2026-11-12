import type { ParseKeys } from 'i18next';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, PlatformColor, StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { PressDim } from '@/ui/PressDim';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const MIC_SIZE = vars['--touch-min'];
const BODY = typeStyle('body');
const PROMPT_LINES = 4;
const PROMPT_MAX = 2000;

export type AskMic = {
  state: 'idle' | 'starting' | 'listening' | 'transcribing';
  live: boolean;
  onMic: () => void;
};

export type AskComposer = {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAddImage: () => void;
  sending: boolean;
  note: string | null;
  mic: AskMic;
};

export function AskInput({ composer, prompt }: { composer: AskComposer; prompt: ParseKeys }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { mic } = composer;
  const listening = mic.state === 'listening';
  const working = composer.sending || mic.state === 'starting' || mic.state === 'transcribing';
  const quiet = mic.state === 'idle';
  const placeholder = listening
    ? t(mic.live ? 'ask.voice.listening' : 'ask.voice.listeningCloud')
    : t(prompt);

  return (
    <View style={[styles.input, { backgroundColor: PlatformColor('secondarySystemBackground') }]}>
      <PressDim
        testID="ask-tapir-add-image"
        accessibilityRole="button"
        accessibilityLabel={t('ask.sheet.addImage')}
        accessibilityState={{ disabled: composer.sending || !quiet }}
        disabled={composer.sending || !quiet}
        style={styles.button}
        onPress={composer.onAddImage}
      >
        <SymbolView name="plus" size={20} tintColor={PlatformColor('secondaryLabel')} />
      </PressDim>
      <TextInput
        testID="ask-tapir-prompt"
        accessibilityLabel={t(prompt)}
        style={[styles.prompt, { color: PlatformColor('label') }]}
        placeholder={placeholder}
        placeholderTextColor={PlatformColor('placeholderText')}
        multiline
        maxLength={PROMPT_MAX}
        editable={!composer.sending && quiet}
        value={composer.text}
        onChangeText={composer.onChangeText}
      />
      {working ? (
        <View style={styles.button}>
          <ActivityIndicator
            accessibilityLabel={t(
              composer.sending ? 'ask.sheet.thinking' : 'ask.voice.transcribing',
            )}
            testID={composer.sending ? 'ask-tapir-checking' : 'ask-tapir-transcribing'}
          />
        </View>
      ) : quiet && composer.text.trim().length > 0 ? (
        <PressDim
          testID="ask-tapir-send"
          accessibilityRole="button"
          accessibilityLabel={t('shell.ask.send')}
          style={styles.button}
          onPress={composer.onSend}
        >
          <SymbolView
            name="arrow.up.circle.fill"
            size={MIC_SIZE - vars['--space-3']}
            tintColor={color('--color-accent')}
          />
        </PressDim>
      ) : null}
      {working ? null : (
        <PressDim
          testID="ask-tapir-mic"
          accessibilityRole="button"
          accessibilityLabel={t(listening ? 'ask.voice.stop' : 'shell.ask.mic')}
          accessibilityState={{ disabled: composer.sending }}
          disabled={composer.sending}
          onPress={mic.onMic}
          style={[
            styles.button,
            {
              backgroundColor: listening ? PlatformColor('systemRed') : PlatformColor('systemFill'),
            },
          ]}
        >
          <SymbolView
            name={listening ? 'stop.fill' : 'mic.fill'}
            size={18}
            tintColor={listening ? color('--color-on-accent') : PlatformColor('secondaryLabel')}
          />
        </PressDim>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-1'],
    minHeight: vars['--touch-min'] + vars['--space-2'],
    paddingHorizontal: vars['--space-1'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  prompt: {
    flex: 1,
    fontSize: BODY.fontSize,
    lineHeight: BODY.lineHeight,
    maxHeight: BODY.lineHeight * PROMPT_LINES + vars['--space-4'],
    paddingVertical: vars['--space-3'],
  },
  button: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import type { ParseKeys } from 'i18next';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  PlatformColor,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PressDim } from '@/ui/PressDim';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ShellTab } from './tabs';

type AskCopy = { prompt: ParseKeys; suggestions: ParseKeys[] };

const BOUNTY_COPY: AskCopy = {
  prompt: 'shell.ask.prompt.bounty',
  suggestions: ['shell.ask.suggestions.bounty.first', 'shell.ask.suggestions.bounty.second'],
};

const COPY: Record<ShellTab, AskCopy> = {
  bounty: BOUNTY_COPY,
  ride: {
    prompt: 'shell.ask.prompt.ride',
    suggestions: ['shell.ask.suggestions.ride.first', 'shell.ask.suggestions.ride.second'],
  },
  messages: {
    prompt: 'shell.ask.prompt.messages',
    suggestions: ['shell.ask.suggestions.messages.first', 'shell.ask.suggestions.messages.second'],
  },
  me: BOUNTY_COPY,
};

const SUBTITLES: Record<ShellTab, ParseKeys> = {
  bounty: 'shell.ask.subtitle.bounty',
  ride: 'shell.ask.subtitle.ride',
  messages: 'shell.ask.subtitle.messages',
  me: 'shell.ask.subtitle.me',
};

const MIC_SIZE = vars['--touch-min'];
const BODY = typeStyle('body');
const PROMPT_LINES = 4;
const PROMPT_MAX = 2000;

export type AskComposer = {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  checking: boolean;
  note: string | null;
};

export function AskTapirSheet({
  tab,
  onClose,
  composer,
}: {
  tab: ShellTab;
  onClose: () => void;
  composer: AskComposer;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const copy = COPY[tab];
  const suggestions = [...copy.suggestions, 'shell.ask.suggestions.writeBounty' as const];

  return (
    <View style={styles.sheet} testID="ask-tapir-sheet">
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: color('--color-card-calm') }]}>
          <Mascot variant="side" size={32} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="title" accessibilityRole="header">
            {t('shell.ask.title')}
          </AppText>
          <AppText variant="meta" tone="secondaryLabel" testID="ask-tapir-subtitle">
            {t(SUBTITLES[tab])}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shell.ask.close')}
          testID="ask-tapir-close"
          onPress={onClose}
          hitSlop={vars['--space-2']}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <SymbolView
            name="xmark.circle.fill"
            size={30}
            tintColor={PlatformColor('tertiaryLabel')}
          />
        </Pressable>
      </View>

      <View style={styles.chips}>
        {suggestions.map((key, index) => (
          <View
            key={key}
            accessible
            testID={`ask-tapir-suggestion-${index}`}
            style={[styles.chip, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
          >
            <AppText variant="secondary">{t(key)}</AppText>
          </View>
        ))}
      </View>

      <View style={[styles.input, { backgroundColor: PlatformColor('secondarySystemBackground') }]}>
        <TextInput
          testID="ask-tapir-prompt"
          accessibilityLabel={t(copy.prompt)}
          style={[styles.prompt, { color: PlatformColor('label') }]}
          placeholder={t(copy.prompt)}
          placeholderTextColor={PlatformColor('placeholderText')}
          multiline
          maxLength={PROMPT_MAX}
          value={composer.text}
          onChangeText={composer.onChangeText}
        />
        {composer.checking ? (
          <View style={styles.mic}>
            <ActivityIndicator
              accessibilityLabel={t('ask.composer.checking')}
              testID="ask-tapir-checking"
            />
          </View>
        ) : composer.text.trim().length > 0 ? (
          <PressDim
            testID="ask-tapir-send"
            accessibilityRole="button"
            accessibilityLabel={t('shell.ask.send')}
            style={styles.mic}
            onPress={composer.onSend}
          >
            <SymbolView
              name="arrow.up.circle.fill"
              size={MIC_SIZE - vars['--space-3']}
              tintColor={color('--color-accent')}
            />
          </PressDim>
        ) : null}
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('shell.ask.mic')}
          accessibilityHint={t('shell.ask.comingSoon')}
          accessibilityState={{ disabled: true }}
          testID="ask-tapir-mic"
          style={[styles.mic, { backgroundColor: PlatformColor('systemFill') }]}
        >
          <SymbolView name="mic.fill" size={18} tintColor={PlatformColor('tertiaryLabel')} />
        </View>
      </View>
      {composer.note ? (
        <AppText variant="secondary" testID="ask-tapir-note">
          {composer.note}
        </AppText>
      ) : null}
      <AppText variant="meta" tone="secondaryLabel" testID="ask-tapir-coming-soon">
        {t('shell.ask.comingSoon')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-6'],
    gap: vars['--space-4'],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  avatar: {
    width: vars['--touch-min'],
    height: vars['--touch-min'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  close: {
    width: vars['--touch-min'],
    height: vars['--touch-min'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  chip: {
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'] + vars['--space-2'],
    paddingLeft: vars['--space-4'],
    paddingRight: vars['--space-1'],
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
  mic: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

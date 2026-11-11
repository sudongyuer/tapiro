import type { ParseKeys } from 'i18next';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
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
  onAddImage: () => void;
  sending: boolean;
  note: string | null;
};

export function AskTapirSheet({
  tab,
  onClose,
  composer,
  onSuggestion,
  showSuggestions,
  replies,
  children,
}: {
  tab: ShellTab;
  onClose: () => void;
  composer: AskComposer;
  onSuggestion: (text: string) => void;
  showSuggestions: boolean;
  replies: number;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (replies > 0) scroll.current?.scrollToEnd({ animated: true });
  }, [replies]);
  const copy = COPY[tab];
  const suggestions = [...copy.suggestions, 'shell.ask.suggestions.writeBounty' as const];

  return (
    <ScrollView
      ref={scroll}
      style={styles.scroll}
      contentContainerStyle={styles.sheet}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      testID="ask-tapir-sheet"
    >
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

      <View style={styles.body} testID="ask-tapir-body">
        {showSuggestions ? (
          <View style={styles.chips}>
            {suggestions.map((key, index) => (
              <PressDim
                key={key}
                accessibilityRole="button"
                testID={`ask-tapir-suggestion-${index}`}
                onPress={() => onSuggestion(t(key))}
                style={[
                  styles.chip,
                  { backgroundColor: PlatformColor('secondarySystemBackground') },
                ]}
              >
                <AppText variant="secondary">{t(key)}</AppText>
              </PressDim>
            ))}
          </View>
        ) : null}
        {children}
        <View
          style={[styles.input, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
        >
          <PressDim
            testID="ask-tapir-add-image"
            accessibilityRole="button"
            accessibilityLabel={t('ask.sheet.addImage')}
            accessibilityState={{ disabled: composer.sending }}
            disabled={composer.sending}
            style={styles.mic}
            onPress={composer.onAddImage}
          >
            <SymbolView name="plus" size={20} tintColor={PlatformColor('secondaryLabel')} />
          </PressDim>
          <TextInput
            testID="ask-tapir-prompt"
            accessibilityLabel={t(copy.prompt)}
            style={[styles.prompt, { color: PlatformColor('label') }]}
            placeholder={t(copy.prompt)}
            placeholderTextColor={PlatformColor('placeholderText')}
            multiline
            maxLength={PROMPT_MAX}
            editable={!composer.sending}
            value={composer.text}
            onChangeText={composer.onChangeText}
          />
          {composer.sending ? (
            <View style={styles.mic}>
              <ActivityIndicator
                accessibilityLabel={t('ask.sheet.thinking')}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-6'],
    gap: vars['--space-4'],
  },
  scroll: { flex: 1 },
  body: { gap: vars['--space-4'] },
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
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
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
  mic: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

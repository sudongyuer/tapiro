import type { ParseKeys } from 'i18next';
import { Stack } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useSheetFill } from '@/ui/theme/useSheetFill';
import { useTheme } from '@/ui/theme/useTheme';

import { AskInput, type AskComposer } from './AskInput';
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

export function AskTapirSheet({
  tab,
  onClose,
  composer,
  onSuggestion,
  showSuggestions,
  replies,
  belly,
  notice,
  children,
}: {
  tab: ShellTab;
  onClose: () => void;
  composer: AskComposer;
  onSuggestion: (text: string) => void;
  showSuggestions: boolean;
  replies: number;
  belly: ReactNode;
  notice: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const fill = useSheetFill();
  const scroll = useRef<ScrollViewInstance>(null);
  const follow = useRef(false);
  useEffect(() => {
    if (replies === 0) return;
    follow.current = true;
    scroll.current?.scrollToEnd({ animated: true });
  }, [replies]);
  const copy = COPY[tab];
  const suggestions = [...copy.suggestions, 'shell.ask.suggestions.writeBounty' as const];

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('shell.ask.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      {/* No automatic inset for the bar: the sheet's own header sits in the bar's row beside the close button, keeping
          the first detent's room for the field and the hungry card's buttons. */}
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.sheet}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (follow.current) scroll.current?.scrollToEnd({ animated: true });
        }}
        onScrollBeginDrag={() => {
          follow.current = false;
        }}
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
            {belly}
          </View>
          <View style={styles.closeSlot} />
        </View>

        <View style={styles.body} testID="ask-tapir-body">
          {notice}
          {showSuggestions ? (
            <View style={styles.chips}>
              {suggestions.map((key, index) => (
                <PressDim
                  key={key}
                  accessibilityRole="button"
                  testID={`ask-tapir-suggestion-${index}`}
                  onPress={() => onSuggestion(t(key))}
                  style={[styles.chip, { backgroundColor: fill }]}
                >
                  <AppText variant="secondary">{t(key)}</AppText>
                </PressDim>
              ))}
            </View>
          ) : null}
          {children}
          <AskInput composer={composer} prompt={copy.prompt} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-6'],
    gap: vars['--space-4'],
  },
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
  closeSlot: { width: vars['--touch-min'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  chip: {
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
});

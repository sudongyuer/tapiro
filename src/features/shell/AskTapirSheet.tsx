import type { ParseKeys } from 'i18next';
import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
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
  const headerHeight = useHeaderHeight();
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (replies > 0) scroll.current?.scrollToEnd({ animated: true });
  }, [replies]);
  const copy = COPY[tab];
  const suggestions = [...copy.suggestions, 'shell.ask.suggestions.writeBounty' as const];

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('shell.ask.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      {/* The header's inset is padding, not the automatic content inset: automaticallyAdjustKeyboardInsets scrolls to
          an offset clamped to -contentInset.top, which leaves the automatic inset out (see ReviewSheet). */}
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.sheet, { paddingTop: headerHeight + vars['--space-2'] }]}
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
            {belly}
          </View>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  chip: {
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
});

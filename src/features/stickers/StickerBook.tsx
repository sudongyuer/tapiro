import { useState } from 'react';
import { ActivityIndicator, PlatformColor, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useStickers } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { InkText } from '@/ui/InkText';
import { Mascot } from '@/ui/Mascot';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { bookViewStore, initialBookView } from './bookView';
import type { BookView } from './bookViewStore';
import { BookSwitch } from './BookSwitch';
import { CardStack } from './CardStack';
import { MonthCalendar } from './MonthCalendar';

const EMPTY_MASCOT = 150;

export function StickerBook({ userId }: { userId: string }) {
  const { t } = useI18n();
  const view = useStickers(userId);
  const [shape, setShape] = useState<BookView>(() => initialBookView(userId));
  const [focusId, setFocusId] = useState<string | null>(null);
  const choose = (next: BookView) => {
    bookViewStore.setView(userId, next);
    setShape(next);
  };
  const sub = t('stickers.book.sub');

  return (
    <MomentBackground testID="sticker-book">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <InkText
            variant="large-title"
            outline={vars['--sticker-border']}
            ink={PlatformColor('label')}
            accessibilityRole="header"
            testID="sticker-book-title"
            style={styles.heavy}
          >
            {t('stickers.book.title')}
          </InkText>
          <AppText variant="meta" tone="secondaryLabel" testID="sticker-book-count">
            {view.status === 'ready'
              ? t('stickers.book.summary', {
                  total: t('stickers.count', { count: view.stickers.length }),
                  sub,
                })
              : sub}
          </AppText>
        </View>
        {view.status === 'loading' ? (
          <ActivityIndicator
            style={styles.state}
            accessibilityLabel={t('stickers.loading')}
            testID="sticker-book-loading"
          />
        ) : view.status === 'failed' ? (
          <View style={styles.state} testID="sticker-book-failed">
            <AppText variant="title" style={styles.center}>
              {t('stickers.loadFailed.title')}
            </AppText>
            <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
              {t('stickers.loadFailed.body')}
            </AppText>
            <PillButton
              label={t('stickers.retry')}
              onPress={view.retry}
              testID="sticker-book-retry"
            />
          </View>
        ) : view.stickers.length === 0 && view.status === 'ready' ? (
          <View style={styles.state} testID="sticker-book-empty">
            <Mascot variant="front" size={EMPTY_MASCOT} outlined />
            <AppText
              variant="title"
              style={[styles.center, styles.heavy]}
              accessibilityRole="header"
            >
              {t('stickers.empty.title')}
            </AppText>
            <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
              {t('stickers.empty.body')}
            </AppText>
          </View>
        ) : (
          <View style={styles.book}>
            {view.status === 'stale' ? (
              <View style={styles.stale} testID="sticker-book-stale">
                <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
                  {t('stickers.stale')}
                </AppText>
                <PillButton
                  label={t('stickers.retry')}
                  variant="plain"
                  onPress={view.retry}
                  testID="sticker-book-stale-retry"
                />
              </View>
            ) : null}
            <BookSwitch view={shape} onChoose={choose} />
            {shape === 'stack' ? (
              <CardStack key={focusId ?? 'top'} stickers={view.stickers} focusId={focusId} />
            ) : (
              <MonthCalendar
                stickers={view.stickers}
                onOpen={(id) => {
                  setFocusId(id);
                  choose('stack');
                }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </MomentBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: vars['--space-5'],
    paddingBottom: vars['--space-7'],
    gap: vars['--space-5'],
  },
  heading: { gap: vars['--space-1'] },
  heavy: { fontWeight: '800' },
  center: { textAlign: 'center' },
  state: {
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingTop: vars['--space-7'],
    paddingHorizontal: vars['--space-5'],
  },
  book: { gap: vars['--space-5'] },
  stale: { alignItems: 'center', gap: vars['--space-1'] },
});

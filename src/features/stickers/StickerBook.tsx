import { ActivityIndicator, PlatformColor, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useStickers, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { InkText } from '@/ui/InkText';
import { Mascot } from '@/ui/Mascot';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { cellLabel } from './cellLabel';
import { StickerCell } from './StickerCell';

const COLUMNS = 3;
const EMPTY_MASCOT = 150;

function rows(stickers: Sticker[]) {
  return Array.from({ length: Math.ceil(stickers.length / COLUMNS) }, (_, row) =>
    stickers.slice(row * COLUMNS, row * COLUMNS + COLUMNS),
  );
}

export function StickerBook({ userId }: { userId: string }) {
  const { t, language } = useI18n();
  const view = useStickers(userId);
  const day = new Intl.DateTimeFormat(language, { month: 'numeric', day: 'numeric' });
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
          <View style={styles.grid}>
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
            {rows(view.stickers).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {Array.from({ length: COLUMNS }, (_, column) => {
                  const sticker = row[column];
                  const index = rowIndex * COLUMNS + column;
                  if (!sticker) return <View key={column} style={styles.filler} />;
                  const date = day.format(new Date(sticker.earnedAt));
                  return (
                    <StickerCell
                      key={sticker.id}
                      sticker={sticker}
                      index={index}
                      date={date}
                      label={cellLabel(sticker, date, t)}
                    />
                  );
                })}
              </View>
            ))}
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
  grid: { gap: vars['--space-6'] - 2 },
  row: { flexDirection: 'row', gap: vars['--space-2'] },
  filler: { flex: 1 },
  stale: { alignItems: 'center', gap: vars['--space-1'] },
});

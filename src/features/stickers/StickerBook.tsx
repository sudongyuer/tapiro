import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { useStickers, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { Deck } from './Deck';
import { useBookFocus } from './useBookFocus';

const EMPTY_MASCOT = 150;

export function StickerBook({ userId }: { userId: string }) {
  return (
    <MomentBackground testID="sticker-book">
      <SafeAreaProvider style={styles.fill}>
        <BookBody userId={userId} />
      </SafeAreaProvider>
    </MomentBackground>
  );
}

function BookBody({ userId }: { userId: string }) {
  const { t } = useI18n();
  const view = useStickers(userId);
  const insets = useSafeAreaInsets();
  const frame = { paddingTop: insets.top, paddingBottom: insets.bottom + vars['--space-4'] };

  if (view.status === 'loading' || view.status === 'failed' || view.stickers.length === 0) {
    return (
      <View style={[styles.fill, frame]}>
        <Stack.Screen options={{ headerTitle: t('stickers.book.title') }} />
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
        ) : (
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
        )}
      </View>
    );
  }

  return (
    <View style={[styles.fill, frame]}>
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
      <BookDeck stickers={view.stickers} />
    </View>
  );
}

function BookDeck({ stickers }: { stickers: Sticker[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const focus = useBookFocus(stickers);
  const { index, sticker } = focus;
  return (
    <>
      <Stack.Screen options={{ headerTitle: focus.title }} />
      {index > 0 ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel={t('stickers.book.today')}
            onPress={() => focus.jump(0)}
          >
            {t('stickers.book.today')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <View style={styles.middle}>
        <Deck
          key={`${focus.epoch}:${stickers.length}`}
          stickers={stickers}
          start={index}
          onTurn={focus.turn}
          onJump={focus.jump}
        />
        {stickers.length > 1 ? (
          <AppText
            variant="meta"
            tone="secondaryLabel"
            style={styles.center}
            testID="sticker-stack-position"
          >
            {t('stickers.card.position', { index: index + 1, total: stickers.length })}
          </AppText>
        ) : null}
      </View>
      <View style={styles.bar}>
        <PillButton
          label={t('stickers.book.calendar')}
          symbol="calendar"
          variant="secondary"
          onPress={() => router.push('/sticker-calendar')}
          testID="sticker-book-calendar"
        />
        <PillButton
          label={t('stickers.book.share')}
          symbol="square.and.arrow.up"
          onPress={() => router.push({ pathname: '/sticker-share', params: { card: sticker.id } })}
          testID="sticker-book-share"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heavy: { fontWeight: '800' },
  center: { textAlign: 'center', paddingHorizontal: vars['--space-5'] },
  state: {
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingTop: vars['--space-7'],
    paddingHorizontal: vars['--space-5'],
  },
  stale: { alignItems: 'center', gap: vars['--space-1'], paddingTop: vars['--space-2'] },
  middle: { flex: 1, justifyContent: 'center', gap: vars['--space-3'] },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: vars['--space-3'],
    paddingHorizontal: vars['--space-5'],
  },
});

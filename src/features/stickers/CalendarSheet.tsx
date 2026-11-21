import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { dateFormat } from '@/lib/intlCache';
import { useStickers, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { monthIndex, monthOf, monthRange, type Month } from './calendar';
import { monthInView, monthsBetween, type Span } from './monthInView';
import { MonthGrid } from './MonthGrid';
import { bookFocus } from './services';

const SHARE_ROOM = vars['--touch-min'] + vars['--space-7'] * 2;

export function CalendarSheet({
  userId,
  onOpen,
  onShare,
}: {
  userId: string;
  onOpen: () => void;
  onShare: (month: Month) => void;
}) {
  const { t } = useI18n();
  const view = useStickers(userId);
  if (view.status === 'loading')
    return <ActivityIndicator style={styles.state} accessibilityLabel={t('stickers.loading')} />;
  if (view.status === 'failed')
    return (
      <View style={styles.state} testID="sticker-calendar-failed">
        <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
          {t('stickers.loadFailed.title')}
        </AppText>
        <PillButton label={t('stickers.retry')} variant="secondary" onPress={view.retry} />
      </View>
    );
  return (
    <Months
      stickers={view.stickers}
      stale={view.status === 'stale'}
      onOpen={(id) => {
        bookFocus.jumpTo(id);
        onOpen();
      }}
      onShare={onShare}
    />
  );
}

function Months({
  stickers,
  stale,
  onOpen,
  onShare,
}: {
  stickers: Sticker[];
  stale: boolean;
  onOpen: (stickerId: string) => void;
  onShare: (month: Month) => void;
}) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [today] = useState(() => new Date());
  const range = monthRange(
    stickers.map((sticker) => sticker.earnedAt),
    today,
  );
  const months = monthsBetween(range.first, range.last);
  const [target] = useState(() => {
    const shown = stickers.find((sticker) => sticker.id === bookFocus.shown()) ?? stickers[0];
    const month = shown ? monthOf(shown.earnedAt) : range.last;
    return Math.max(0, monthIndex(month) - monthIndex(range.first));
  });
  const [inView, setInView] = useState(target);
  const [placed, setPlaced] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const spans = useRef<(Span | undefined)[]>([]);
  const placedOnce = useRef(false);

  const onSpan = useCallback(
    (at: number, y: number, height: number) => {
      spans.current[at] = { y, height };
      if (at !== target || placedOnce.current) return;
      placedOnce.current = true;
      scroll.current?.scrollTo({ y: y - headerHeight, animated: false });
      setPlaced(true);
    },
    [target, headerHeight],
  );

  const month = months[inView] ?? range.last;
  const monthName = dateFormat(language, { month: 'long' }).format(
    new Date(month.year, month.month, 1),
  );

  return (
    <View style={styles.fill} testID="sticker-calendar">
      <ScrollView
        ref={scroll}
        style={[styles.fill, !placed && styles.hidden]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: SHARE_ROOM + insets.bottom }]}
        scrollEventThrottle={32}
        onScroll={({ nativeEvent }) => {
          const next = monthInView(
            spans.current,
            nativeEvent.contentOffset.y + headerHeight,
            nativeEvent.layoutMeasurement.height - headerHeight,
          );
          if (next >= 0 && next !== inView) setInView(next);
        }}
      >
        <AppText variant="meta" tone="secondaryLabel" testID="sticker-calendar-count">
          {t('stickers.calendar.count', {
            title: t('stickers.book.title'),
            total: t('stickers.count', { count: stickers.length }),
          })}
        </AppText>
        {stale ? (
          <AppText variant="meta" tone="secondaryLabel" testID="sticker-calendar-stale">
            {t('stickers.stale')}
          </AppText>
        ) : null}
        {months.map((each, at) => (
          <MonthGrid
            key={`${each.year}-${each.month}`}
            at={at}
            month={each}
            stickers={stickers}
            today={today}
            onOpen={onOpen}
            onSpan={onSpan}
          />
        ))}
      </ScrollView>
      <View
        pointerEvents="box-none"
        style={[styles.share, { bottom: insets.bottom + vars['--space-4'] }]}
      >
        <PillButton
          label={t('stickers.calendar.share', { month: monthName })}
          symbol="square.and.arrow.up"
          onPress={() => onShare(month)}
          testID="sticker-calendar-share"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { opacity: 0 },
  content: { paddingHorizontal: vars['--space-4'], gap: vars['--space-2'] },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: vars['--space-3'] },
  center: { textAlign: 'center' },
  share: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { dateFormat, numberFormat } from '@/lib/intlCache';
import { stickerArt, stickerLabel, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { HandText } from '@/ui/HandText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { byDay, dayKey, monthWeeks, weekdayNames, type Month } from './calendar';

const ART = 40;
const CELL = 52;
const BADGE = 18;

export const MonthGrid = memo(function MonthGrid({
  at,
  month,
  stickers,
  today,
  onOpen,
  onSpan,
}: {
  at: number;
  month: Month;
  stickers: Sticker[];
  today: Date;
  onOpen: (stickerId: string) => void;
  onSpan: (at: number, y: number, height: number) => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const days = byDay(stickers, month);
  const heading = dateFormat(language, { year: 'numeric', month: 'long' }).format(
    new Date(month.year, month.month, 1),
  );
  const dayName = dateFormat(language, { month: 'long', day: 'numeric' });
  const count = numberFormat(language);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <View
      style={styles.month}
      onLayout={({ nativeEvent }) => onSpan(at, nativeEvent.layout.y, nativeEvent.layout.height)}
      testID={`sticker-calendar-${dayKey(month, 1).slice(0, 7)}`}
    >
      <HandText hand="month" accessibilityRole="header" style={styles.heading}>
        {heading}
      </HandText>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
        {weekdayNames(dateFormat(language, { weekday: 'narrow' })).map((name, column) => (
          <AppText key={column} variant="meta" tone="secondaryLabel" style={styles.weekday}>
            {name}
          </AppText>
        ))}
      </View>
      {monthWeeks(month).map((week, row) => (
        <View key={row} style={styles.row}>
          {week.map((day, cell) => {
            if (day === null) return <View key={cell} style={styles.cell} />;
            const list = days.get(day) ?? [];
            const date = new Date(month.year, month.month, day);
            const label = dayName.format(date);
            const testID = `sticker-calendar-day-${dayKey(month, day)}`;
            if (list.length === 0) {
              const later = date.getTime() > todayStart;
              return (
                <View
                  key={cell}
                  style={styles.cell}
                  accessible
                  accessibilityLabel={label}
                  testID={testID}
                >
                  <AppText
                    variant="secondary"
                    tone={later ? 'tertiaryLabel' : 'secondaryLabel'}
                    style={later ? styles.later : null}
                  >
                    {count.format(day)}
                  </AppText>
                </View>
              );
            }
            const titles = list
              .map((sticker) => stickerLabel(sticker, t).title)
              .join(t('stickers.calendar.join'));
            return (
              <PressDim
                key={cell}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={t('stickers.calendar.dayDone', {
                  date: label,
                  count: list.length,
                  titles,
                })}
                accessibilityHint={t('stickers.calendar.open')}
                onPress={() => onOpen(list[0].id)}
                testID={testID}
              >
                <HandArt id={stickerArt(list[0])} size={ART} />
                {list.length > 1 ? (
                  <View style={[styles.badge, { backgroundColor: color('--color-accent') }]}>
                    <AppText
                      variant="meta"
                      style={[styles.badgeText, { color: color('--color-on-accent') }]}
                    >
                      {count.format(list.length)}
                    </AppText>
                  </View>
                ) : null}
              </PressDim>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  month: { gap: vars['--space-2'], paddingBottom: vars['--space-6'] },
  heading: { paddingHorizontal: vars['--space-2'] },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },
  later: { opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: 0,
    right: vars['--space-1'],
    minWidth: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    paddingHorizontal: vars['--space-1'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '700', lineHeight: BADGE },
});

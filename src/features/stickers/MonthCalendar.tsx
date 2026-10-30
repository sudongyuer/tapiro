import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { stickerArt, stickerLabel, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { HandText } from '@/ui/HandText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';

import {
  byDay,
  monthGrid,
  monthIndex,
  monthOf,
  monthRange,
  shiftMonth,
  type Month,
} from './calendar';

const CELL_ART = 36;
const MONDAY = new Date(2026, 9, 5);
const TAP = 44;

function weekdays(language: string) {
  const format = new Intl.DateTimeFormat(language, { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, day) =>
    format.format(new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() + day)),
  );
}

export function MonthCalendar({
  stickers,
  onOpen,
}: {
  stickers: Sticker[];
  onOpen: (stickerId: string) => void;
}) {
  const { t, language } = useI18n();
  const range = monthRange(
    stickers.map((sticker) => sticker.earnedAt),
    new Date(),
  );
  const [month, setMonth] = useState<Month>(() =>
    stickers[0] ? monthOf(stickers[0].earnedAt) : range.last,
  );
  const days = byDay(stickers, month);
  const done = [...days.values()].reduce((sum, list) => sum + list.length, 0);
  const heading = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long' }).format(
    new Date(month.year, month.month, 1),
  );
  const dayName = new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' });
  const canBack = monthIndex(month) > monthIndex(range.first);
  const canForward = monthIndex(month) < monthIndex(range.last);

  return (
    <View style={styles.wrap} testID="sticker-calendar">
      <View style={styles.header}>
        <Step
          symbol="chevron.left"
          label={t('stickers.calendar.previous')}
          enabled={canBack}
          onPress={() => setMonth(shiftMonth(month, -1))}
          testID="sticker-calendar-previous"
        />
        <View style={styles.title}>
          <HandText hand="month" accessibilityRole="header" testID="sticker-calendar-month">
            {heading}
          </HandText>
          <AppText variant="meta" tone="secondaryLabel" testID="sticker-calendar-summary">
            {t('stickers.calendar.summary', { count: done })}
          </AppText>
        </View>
        <Step
          symbol="chevron.right"
          label={t('stickers.calendar.next')}
          enabled={canForward}
          onPress={() => setMonth(shiftMonth(month, 1))}
          testID="sticker-calendar-next"
        />
      </View>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
        {weekdays(language).map((name, column) => (
          <AppText key={column} variant="meta" tone="secondaryLabel" style={styles.weekday}>
            {name}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {monthGrid(month).map((day, cell) => {
          if (day === null) return <View key={cell} style={styles.cell} />;
          const list = days.get(day) ?? [];
          const date = dayName.format(new Date(month.year, month.month, day));
          const testID = `sticker-calendar-day-${day}`;
          if (list.length === 0) {
            return (
              <View
                key={cell}
                style={styles.cell}
                accessible
                accessibilityLabel={date}
                testID={testID}
              >
                <AppText variant="meta" tone="tertiaryLabel">
                  {day}
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
                date,
                count: list.length,
                titles,
              })}
              accessibilityHint={t('stickers.calendar.open')}
              onPress={() => onOpen(list[0].id)}
              testID={testID}
            >
              <AppText variant="meta" style={styles.doneDay}>
                {day}
              </AppText>
              <HandArt id={stickerArt(list[0])} size={CELL_ART} />
            </PressDim>
          );
        })}
      </View>
    </View>
  );
}

function Step({
  symbol,
  label,
  enabled,
  onPress,
  testID,
}: {
  symbol: 'chevron.left' | 'chevron.right';
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <PressDim
      style={styles.step}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      testID={testID}
    >
      <SymbolView
        name={symbol}
        size={vars['--text-body']}
        tintColor={PlatformColor(enabled ? 'link' : 'tertiaryLabel')}
      />
    </PressDim>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: vars['--space-3'] },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, alignItems: 'center' },
  step: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: vars['--space-2'] },
  cell: { width: `${100 / 7}%`, minHeight: 60, alignItems: 'center', gap: 2 },
  doneDay: { fontWeight: '700' },
});

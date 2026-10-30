import { useState } from 'react';
import { PlatformColor, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { axisMarks, beyondCount, type AxisMark } from './axis';
import { markLabel } from './axisFocus';
import type { BoardRow } from './types';

const TARGET = vars['--touch-min'];
const STICKER = 26;
const DOT = 10;
const LINE = 2;
const TICK = 8;
const LANE = TARGET / 2;
const CLEAR_OF_DOT = DOT / 2 + STICKER / 2 + 2;

export function DistanceAxis({
  rows,
  beyondTotal,
  next,
  origin,
  onFocus,
}: {
  rows: BoardRow[];
  beyondTotal: number | null;
  next: unknown | null;
  origin: 'me' | 'place';
  onFocus: (id: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [width, setWidth] = useState(0);
  const { marks, firstBeyondId } = axisMarks(rows, width, CLEAR_OF_DOT);
  const beyond = beyondCount({ rows, beyondTotal, next });
  const moreTarget = firstBeyondId ?? rows.findLast((row) => row.distanceM !== null)?.id ?? null;
  const ink = PlatformColor('tertiaryLabel');
  const originName = t(origin === 'me' ? 'bounty.board.axis.you' : 'bounty.board.axis.here');
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(Math.max(0, event.nativeEvent.layout.width - TARGET));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.track} onLayout={onLayout}>
          <View style={[styles.line, { backgroundColor: ink }]} />
          <View style={[styles.dot, { backgroundColor: color('--color-accent') }]} />
          {width > 0 ? (
            <>
              <View style={[styles.tick, { left: LANE + width / 2, backgroundColor: ink }]} />
              <View style={[styles.tick, { left: LANE + width, backgroundColor: ink }]} />
              {marks.map((mark) => (
                <AxisSticker
                  key={mark.ids[0]}
                  mark={mark}
                  rows={rows}
                  onPress={() => onFocus(mark.ids[0])}
                />
              ))}
            </>
          ) : null}
        </View>
        {beyond !== null && beyond > 0 && moreTarget ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bounty.board.axis.moreLabel', { count: beyond })}
            testID="bounty-axis-more"
            onPress={() => onFocus(moreTarget)}
            style={({ pressed }) => [styles.moreTarget, pressed && styles.pressed]}
          >
            <View style={[styles.more, { borderColor: ink }]}>
              <AppText variant="meta" style={styles.moreText}>
                {t('bounty.board.axis.more', { count: beyond })}
              </AppText>
            </View>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.legend}>
        <AppText
          variant="meta"
          tone="secondaryLabel"
          accessible
          accessibilityLabel={t('bounty.board.axis.label', { origin: originName })}
          testID="bounty-axis"
          style={styles.legendStart}
        >
          {originName}
        </AppText>
        {width > 0 ? (
          <View style={[styles.legendTicks, { width: width + TARGET }]} accessibilityElementsHidden>
            <AppText
              variant="meta"
              tone="secondaryLabel"
              style={[styles.tickLabel, { left: LANE + width / 2 - TARGET }]}
            >
              {t('bounty.board.axis.km1')}
            </AppText>
            <AppText
              variant="meta"
              tone="secondaryLabel"
              style={[styles.tickLabel, { left: LANE + width - TARGET }]}
            >
              {t('bounty.board.axis.km2')}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AxisSticker({
  mark,
  rows,
  onPress,
}: {
  mark: AxisMark;
  rows: BoardRow[];
  onPress: () => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const grouped = mark.ids.flatMap((id) => rows.filter((row) => row.id === id));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={markLabel(grouped, t, language)}
      testID={`bounty-axis-mark-${mark.ids[0]}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mark,
        { left: Math.round(mark.x) },
        pressed && styles.pressed,
      ]}
    >
      <HandArt id={mark.art} size={STICKER} />
      {mark.ids.length > 1 ? (
        <View style={[styles.count, { backgroundColor: color('--color-accent') }]}>
          <AppText variant="meta" style={[styles.countText, { color: color('--color-on-accent') }]}>
            {mark.ids.length}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: vars['--space-2'],
    paddingHorizontal: vars['--space-3'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  track: { flex: 1, height: TARGET },
  line: {
    position: 'absolute',
    left: LANE,
    right: LANE,
    top: (TARGET - LINE) / 2,
    height: LINE,
    borderRadius: LINE,
  },
  dot: {
    position: 'absolute',
    left: LANE - DOT / 2,
    top: (TARGET - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  tick: {
    position: 'absolute',
    top: (TARGET - TICK) / 2,
    width: LINE,
    height: TICK,
    marginLeft: -LINE / 2,
  },
  mark: {
    position: 'absolute',
    top: 0,
    width: TARGET,
    height: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    paddingHorizontal: vars['--space-1'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
  },
  countText: { fontWeight: '700' },
  moreTarget: { minWidth: TARGET, minHeight: TARGET, justifyContent: 'center' },
  more: {
    paddingHorizontal: vars['--space-2'],
    paddingVertical: vars['--space-1'],
    borderRadius: vars['--radius-pill'],
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  moreText: { fontWeight: '600' },
  legend: { flexDirection: 'row', minHeight: 16 },
  legendStart: { position: 'absolute', left: LANE - DOT, top: 0 },
  legendTicks: { position: 'relative', height: 16 },
  tickLabel: { position: 'absolute', top: 0, width: TARGET * 2, textAlign: 'center' },
  pressed: { opacity: vars['--opacity-pressed'] },
});

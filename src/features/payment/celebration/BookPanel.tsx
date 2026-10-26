import { useState } from 'react';
import { StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { BookSlots, SLOT_GAP, SLOT_HEIGHT } from './BookSlots';
import { BookTapir } from './BookTapir';
import { Confetti } from './Confetti';
import type { BookSlot } from './model';
import { keyframes, TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

const RULE = 28;
const RULES = 10;
const DOTS = 9;
const BUMP = [0, 0.22, 0.55, 1];

export type SlotCentre = { x: number; y: number; width: number };

export function slotCentre(grid: LayoutRectangle, index: number | null): SlotCentre {
  const width = (grid.width - 2 * SLOT_GAP) / 3;
  if (index === null) return { x: grid.x + grid.width / 2, y: grid.y + grid.height / 2, width };
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: grid.x + column * (width + SLOT_GAP) + width / 2,
    y: grid.y + row * (SLOT_HEIGHT + SLOT_GAP) + SLOT_HEIGHT / 2,
    width,
  };
}

export function BookPanel({
  clock,
  first,
  slots,
  target,
  drop,
  title,
  counts,
  badge,
  countLabel,
  onFrame,
  onTarget,
}: {
  clock: Clock;
  first: boolean;
  slots: BookSlot[];
  target: number | null;
  drop: number;
  title: string;
  counts: [string, string] | null;
  badge: string;
  countLabel: string;
  onFrame: (frame: LayoutRectangle) => void;
  onTarget: (centre: SlotCentre) => void;
}) {
  const { color } = useTheme();
  const [grid, setGrid] = useState<LayoutRectangle | null>(null);
  const [line, setLine] = useState(0);
  const rise = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.book, 0, 1);
    const lift = drop * (1 - tween(clock.value, TIMELINE.converge, 0, 1));
    return {
      transform: [{ translateY: 340 * (1 - p) + lift }, { rotate: `${3 * (1 - p)}deg` }],
    };
  });
  const bump = useAnimatedStyle(() => {
    const { start, duration } = TIMELINE.bump;
    const t = clock.value;
    return {
      transform: [
        { translateY: keyframes(t, start, duration, BUMP, [0, 7, -3, 0]) },
        { scaleX: keyframes(t, start, duration, BUMP, [1, 1.012, 1, 1]) },
        { scaleY: keyframes(t, start, duration, BUMP, [1, 0.985, 1, 1]) },
      ],
    };
  });
  const roll = useAnimatedStyle(() => ({
    transform: [{ translateY: -line * tween(clock.value, TIMELINE.count, 0, 1) }],
  }));
  const pop = useAnimatedStyle(() => {
    const { start, duration, curve } = TIMELINE.badge;
    const t = clock.value;
    const at = (values: number[]) => keyframes(t, start, duration, [0, 0.6, 1], values, curve);
    return {
      opacity: at([0, 1, 1]),
      transform: [{ scale: at([0.2, 1.12, 1]) }, { rotate: `${at([-30, 6, -8])}deg` }],
    };
  });
  const centre = grid ? slotCentre(grid, target) : null;
  return (
    <Animated.View
      style={[styles.panel, rise]}
      onLayout={(event) => onFrame(event.nativeEvent.layout)}
    >
      <BookTapir clock={clock} first={first} />
      <Animated.View
        style={[
          styles.paper,
          { backgroundColor: color('--color-paper'), shadowColor: color('--color-sticker-shadow') },
          bump,
        ]}
      >
        <View style={styles.ruled}>
          {Array.from({ length: RULES }, (_, index) => (
            <View
              key={index}
              style={[
                styles.rule,
                { top: (index + 1) * RULE, backgroundColor: color('--color-paper-line') },
              ]}
            />
          ))}
        </View>
        <View style={styles.binding}>
          {Array.from({ length: DOTS }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, { backgroundColor: color('--color-paper-slot') }]}
            />
          ))}
        </View>
        <View
          style={styles.header}
          accessible
          accessibilityLabel={countLabel}
          testID="pay-celebration-book"
        >
          <AppText variant="title" style={[styles.heavy, { color: color('--color-on-paper') }]}>
            {title}
          </AppText>
          {counts ? (
            <View style={[styles.count, line ? { height: line } : null]}>
              <Animated.View style={roll}>
                {counts.map((label, index) => (
                  <AppText
                    key={index}
                    variant="meta"
                    style={[styles.bold, { color: color('--color-on-paper-muted') }]}
                    onLayout={
                      index === 0 ? (event) => setLine(event.nativeEvent.layout.height) : undefined
                    }
                  >
                    {label}
                  </AppText>
                ))}
              </Animated.View>
            </View>
          ) : null}
        </View>
        <View
          onLayout={(event) => {
            const next = event.nativeEvent.layout;
            setGrid(next);
            onTarget(slotCentre(next, target));
          }}
        >
          <BookSlots slots={slots} clock={clock} />
        </View>
        {centre ? (
          <View style={[styles.burst, { left: centre.x, top: centre.y }]} pointerEvents="none">
            <Confetti clock={clock} count={first ? 16 : 10} />
          </View>
        ) : null}
        {first && centre ? (
          <Animated.View
            style={[
              styles.badge,
              {
                left: centre.x - centre.width / 2 + vars['--space-6'],
                top: centre.y - SLOT_HEIGHT / 2 - vars['--space-3'],
                backgroundColor: color('--color-paper-green'),
                borderColor: color('--color-sticker-border'),
                shadowColor: color('--color-sticker-shadow'),
              },
              pop,
            ]}
            testID="pay-celebration-badge"
            accessible
            accessibilityLabel={badge}
          >
            <AppText
              variant="meta"
              style={[styles.heavy, { color: color('--color-sticker-border') }]}
            >
              {badge}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: vars['--space-5'] },
  paper: {
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    overflow: 'visible',
    paddingTop: vars['--space-4'],
    paddingBottom: vars['--space-4'],
    paddingRight: vars['--space-4'],
    paddingLeft: vars['--space-6'] + 2,
    gap: vars['--space-3'],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  ruled: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: vars['--radius-sheet'],
    overflow: 'hidden',
  },
  rule: { position: 'absolute', left: 0, right: 0, height: 1 },
  binding: {
    position: 'absolute',
    left: vars['--space-3'] - 2,
    top: vars['--space-5'] + 2,
    bottom: vars['--space-5'] + 2,
    justifyContent: 'space-between',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: vars['--space-2'],
  },
  heavy: { fontWeight: '800' },
  bold: { fontWeight: '700', textAlign: 'right' },
  count: { overflow: 'hidden' },
  burst: { position: 'absolute' },
  badge: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: vars['--radius-chip'],
    paddingHorizontal: vars['--space-2'],
    paddingVertical: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
});

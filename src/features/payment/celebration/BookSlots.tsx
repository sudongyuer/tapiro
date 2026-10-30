import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { stickerArt } from '@/lib/stickers';
import { HandArt } from '@/ui/HandArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { BOOK_COLUMNS, BOOK_SLOTS, shiftStart, type BookCard, type BookSlot } from './model';
import { EASE_OUT, keyframes, TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

export const SLOT_HEIGHT = 84;
export const SLOT_GAP = 10;
const SLOT_ART = 44;
const GLOW_SPREAD = 16;

function Target({ clock }: { clock: Clock }) {
  const { color } = useTheme();
  const outline = useAnimatedStyle(() => ({
    opacity: 1 - tween(clock.value, TIMELINE.fill, 0, 1),
  }));
  const fill = useAnimatedStyle(() => ({ opacity: tween(clock.value, TIMELINE.fill, 0, 1) }));
  const glow = useAnimatedStyle(() => {
    const { start, duration } = TIMELINE.glow;
    const t = clock.value;
    return {
      opacity: keyframes(t, start, duration, [0, 0.18, 1], [0, 1, 0], EASE_OUT),
      transform: [{ scale: keyframes(t, start, duration, [0, 1], [0.6, 1.7], EASE_OUT) }],
    };
  });
  return (
    <>
      <Animated.View
        style={[
          styles.glow,
          {
            experimental_backgroundImage: `radial-gradient(circle, ${color('--color-glow')}, ${color('--color-glow-clear')} 70%)`,
          },
          glow,
        ]}
      />
      <Animated.View
        style={[styles.fill, { backgroundColor: color('--color-paper-landed') }, fill]}
      />
      <Animated.View
        style={[styles.fill, styles.dashed, { borderColor: color('--color-paper-slot') }, outline]}
      />
    </>
  );
}

function Card({
  slot,
  index,
  step,
  clock,
}: {
  slot: Extract<BookSlot, { from: number | null }>;
  index: number;
  step: number;
  clock: Clock;
}) {
  const { color } = useTheme();
  const { from } = slot;
  const offset = from === null ? null : shiftStart(from, index, step, SLOT_HEIGHT + SLOT_GAP);
  const shift = useAnimatedStyle(() => {
    if (!offset) return {};
    const rest = 1 - tween(clock.value, TIMELINE.shift, 0, 1);
    return { transform: [{ translateX: offset.x * rest }, { translateY: offset.y * rest }] };
  });
  const outline = useAnimatedStyle(() => ({
    opacity: 1 - tween(clock.value, TIMELINE.shift, 0, 1),
  }));
  const paper = { backgroundColor: color('--color-paper-line') };
  return (
    <>
      {slot.leaving ? (
        <Animated.View style={[styles.fill, styles.filled, paper, outline]}>
          <CardArt card={slot.leaving} index={index} />
        </Animated.View>
      ) : slot.arrives ? (
        <Animated.View
          style={[
            styles.fill,
            styles.dashed,
            { borderColor: color('--color-paper-slot') },
            outline,
          ]}
        />
      ) : null}
      <Animated.View style={[styles.fill, styles.filled, paper, shift]}>
        <CardArt card={slot} index={index} />
      </Animated.View>
    </>
  );
}

function CardArt({ card, index }: { card: BookCard; index: number }) {
  if (card.kind !== 'sticker') return null;
  return (
    <View style={{ transform: [{ rotate: `${index % 2 ? 6 : -6}deg` }] }}>
      <HandArt id={stickerArt(card.sticker)} size={SLOT_ART} />
    </View>
  );
}

function Slot({
  slot,
  index,
  step,
  clock,
}: {
  slot: BookSlot;
  index: number;
  step: number;
  clock: Clock;
}) {
  const { color } = useTheme();
  if (slot.kind === 'target') return <Target clock={clock} />;
  if (slot.kind === 'empty')
    return (
      <View style={[styles.fill, styles.dashed, { borderColor: color('--color-paper-slot') }]} />
    );
  return <Card slot={slot} index={index} step={step} clock={clock} />;
}

export function BookSlots({ slots, clock }: { slots: BookSlot[]; clock: Clock }) {
  const [width, setWidth] = useState(0);
  const step = (width - (BOOK_COLUMNS - 1) * SLOT_GAP) / BOOK_COLUMNS + SLOT_GAP;
  const rows = [slots.slice(0, BOOK_COLUMNS), slots.slice(BOOK_COLUMNS, BOOK_SLOTS)];
  return (
    <View style={styles.grid} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((slot, column) => (
            <View key={column} style={styles.cell}>
              <Slot
                slot={slot}
                index={rowIndex * BOOK_COLUMNS + column}
                step={step}
                clock={clock}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: SLOT_GAP },
  row: { flexDirection: 'row', gap: SLOT_GAP },
  cell: { flex: 1, height: SLOT_HEIGHT },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: vars['--radius-card'],
  },
  dashed: { borderWidth: 2, borderStyle: 'dashed' },
  filled: { alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  glow: {
    position: 'absolute',
    top: -GLOW_SPREAD,
    left: -GLOW_SPREAD,
    right: -GLOW_SPREAD,
    bottom: -GLOW_SPREAD,
    borderRadius: vars['--radius-card'] + GLOW_SPREAD,
  },
});

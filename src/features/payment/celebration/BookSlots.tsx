import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { stickerArt } from '@/lib/stickers';
import { EarnedSticker } from '@/ui/EarnedSticker';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { BookSlot } from './model';
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

function Slot({ slot, index, clock }: { slot: BookSlot; index: number; clock: Clock }) {
  const { color } = useTheme();
  if (slot.kind === 'target') return <Target clock={clock} />;
  if (slot.kind === 'empty')
    return (
      <View style={[styles.fill, styles.dashed, { borderColor: color('--color-paper-slot') }]} />
    );
  return (
    <View style={[styles.fill, styles.filled, { backgroundColor: color('--color-paper-line') }]}>
      {slot.kind === 'sticker' ? (
        <View style={{ transform: [{ rotate: `${index % 2 ? 6 : -6}deg` }] }}>
          <EarnedSticker art={stickerArt(slot.sticker)} width={SLOT_ART} />
        </View>
      ) : null}
    </View>
  );
}

export function BookSlots({ slots, clock }: { slots: BookSlot[]; clock: Clock }) {
  const rows = [slots.slice(0, 3), slots.slice(3, 6)];
  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((slot, column) => (
            <View key={column} style={styles.cell}>
              <Slot slot={slot} index={rowIndex * 3 + column} clock={clock} />
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

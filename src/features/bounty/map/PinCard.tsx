import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { cardCopy } from '../board/cardCopy';
import type { BoardRow } from '../board/types';
import { cardWidth, placeCard, TAIL } from './mapLayout';
import { CardBack, CardFront } from './PinCardFaces';
import { usePinCardMotion } from './usePinCardMotion';

const TAIL_SIDE = TAIL * Math.SQRT2;

type PinCardProps = {
  row: BoardRow;
  pin: { x: number; y: number };
  map: { width: number; height: number };
  closing: boolean;
  onGone: () => void;
  onClose: () => void;
  onApply: (id: string) => void;
  onOpen: (id: string) => void;
};

export function PinCard({
  row,
  pin,
  map,
  closing,
  onGone,
  onClose,
  onApply,
  onOpen,
}: PinCardProps) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const copy = cardCopy(row, t, language, new Date());
  const width = cardWidth(map.width);
  const [heights, setHeights] = useState<{ front?: number; back?: number }>({});
  const [flipped, setFlipped] = useState(false);
  const frontRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const measured = heights.front !== undefined && heights.back !== undefined;
  const height = Math.max(heights.front ?? 0, heights.back ?? 0);
  const motion = usePinCardMotion({ ready: measured, closing, flipped, onGone });

  useEffect(() => {
    if (!measured || closing) return;
    const target = (flipped ? backRef : frontRef).current;
    if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }, [measured, closing, flipped]);

  const measure = (face: 'front' | 'back') => (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setHeights((current) => (current[face] === next ? current : { ...current, [face]: next }));
  };

  const placed = placeCard(pin, map, { width, height });
  const flip = () => setFlipped((value) => !value);
  const handlers = {
    row,
    copy,
    onFlip: flip,
    onApply: () => onApply(row.id),
    onOpen: () => onOpen(row.id),
  };
  const surface = {
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    shadowColor: color('--color-sticker-shadow'),
  };
  const live = measured && !closing;
  const tailAt = {
    left: placed.tailX - TAIL_SIDE / 2,
    top: placed.side === 'above' ? height - TAIL_SIDE / 2 - 1 : -TAIL_SIDE / 2 + 1,
  };

  return (
    <Animated.View
      testID="map-card"
      pointerEvents={live ? 'box-none' : 'none'}
      onAccessibilityEscape={onClose}
      style={[
        styles.card,
        {
          left: placed.left,
          top: placed.top,
          width,
          height,
          transformOrigin: [placed.origin.x, placed.origin.y, 0],
        },
        motion.card,
      ]}
    >
      <View pointerEvents="none" style={[styles.tail, styles.tailShadow, surface, tailAt]} />
      <Face
        shown={!flipped}
        anchor={placed.side === 'above' ? styles.bottom : styles.top}
        surface={surface}
        motion={motion.front}
        onFlip={flip}
        onLayout={measure('front')}
      >
        <CardFront {...handlers} summaryRef={frontRef} />
      </Face>
      <Face
        shown={flipped}
        anchor={placed.side === 'above' ? styles.bottom : styles.top}
        surface={surface}
        motion={motion.back}
        onFlip={flip}
        onLayout={measure('back')}
      >
        <CardBack {...handlers} summaryRef={backRef} />
      </Face>
      <View
        pointerEvents="none"
        style={[styles.tail, { backgroundColor: surface.backgroundColor }, tailAt]}
      />
    </Animated.View>
  );
}

function Face({
  shown,
  anchor,
  surface,
  motion,
  onFlip,
  onLayout,
  children,
}: {
  shown: boolean;
  anchor: object;
  surface: object;
  motion: object;
  onFlip: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  return (
    <Animated.View
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      onLayout={onLayout}
      style={[styles.face, anchor, surface, motion]}
    >
      <Pressable accessible={false} onPress={onFlip} style={styles.press}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute' },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backfaceVisibility: 'hidden',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
  press: { flexGrow: 1, padding: vars['--space-4'], gap: vars['--space-3'] },
  tail: {
    position: 'absolute',
    width: TAIL_SIDE,
    height: TAIL_SIDE,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  tailShadow: {
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

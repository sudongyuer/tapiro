import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BountyMapView, type BountyMapPinPress } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { AXIS_RANGE_M } from '../board/axis';
import { BoardLoading } from '../board/BoardStates';
import { PAGE_SIZE } from '../board/boardService';
import type { BoardOrigin, BoardRow, BoardState } from '../board/types';
import { moreChip } from './mapLayout';
import { MoreChip } from './MoreChip';
import { PinCard } from './PinCard';
import { mapPins } from './pins';

const MAP_CHROME = 270;
const MAP_MIN = 320;

export type BoardMapProps = {
  rows: BoardRow[];
  origin: BoardOrigin | null;
  state: BoardState;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
  onPickPlace?: () => void;
  onShowMore: () => void;
  height?: number;
  radiusM?: number;
};

type OpenCard = { id: string; x: number; y: number; key: number; closing: boolean };

function useMapHeight(height: number | undefined) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [frozen] = useState(
    () => height ?? Math.max(MAP_MIN, window.height - insets.top - insets.bottom - MAP_CHROME),
  );
  return frozen;
}

function useOpenCard() {
  const [card, setCard] = useState<OpenCard | null>(null);
  const presses = useRef(0);
  const open = useCallback(({ id, x, y }: BountyMapPinPress) => {
    presses.current += 1;
    setCard({ id, x, y, key: presses.current, closing: false });
  }, []);
  const close = useCallback(
    () =>
      setCard((current) => (current && !current.closing ? { ...current, closing: true } : current)),
    [],
  );
  const gone = useCallback(
    (key: number) => setCard((current) => (current?.key === key ? null : current)),
    [],
  );
  return { card, open, close, gone };
}

export function BoardMap({
  rows,
  origin,
  state,
  onOpen,
  onApply,
  onShowMore,
  height,
  radiusM = AXIS_RANGE_M,
}: BoardMapProps) {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const mapHeight = useMapHeight(height);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { card, open, close, gone } = useOpenCard();
  const pins = useMemo(() => mapPins(rows, t, language, theme), [rows, t, language, theme]);
  const located = origin && origin.kind !== 'none' ? origin : null;
  const latitude = located?.point.latitude;
  const longitude = located?.point.longitude;
  const camera = useMemo(
    () =>
      latitude === undefined || longitude === undefined
        ? null
        : {
            originKey: `${located?.kind}:${latitude},${longitude}:${radiusM}`,
            latitude,
            longitude,
            radiusM,
          },
    [located?.kind, latitude, longitude, radiusM],
  );

  if (state.kind === 'loading') return <BoardLoading testID="bounty-board-loading" />;
  if (state.kind === 'failed' || !located || !camera) return null;

  const row = card ? rows.find((candidate) => candidate.id === card.id) : undefined;
  const chip = moreChip(state, PAGE_SIZE);
  const onLayout = ({ nativeEvent }: LayoutChangeEvent) =>
    setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height });

  return (
    <View testID="bounty-map" style={[styles.map, { height: mapHeight }]} onLayout={onLayout}>
      <BountyMapView
        style={StyleSheet.absoluteFill}
        testID="bounty-map-view"
        pins={pins}
        selectedId={row && !card?.closing ? row.id : undefined}
        origin={{
          ...located.point,
          kind: located.kind,
          title: t('bounty.board.axis.here'),
        }}
        camera={camera}
        onPinPress={open}
        onMapPress={close}
        onRegionChange={close}
      />
      {chip ? (
        <View pointerEvents="box-none" style={styles.chip}>
          <MoreChip chip={chip} onPress={onShowMore} />
        </View>
      ) : null}
      {card && row && size ? (
        <PinCard
          key={card.key}
          row={row}
          pin={card}
          map={size}
          closing={card.closing}
          onGone={() => gone(card.key)}
          onClose={close}
          onApply={onApply}
          onOpen={onOpen}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: vars['--radius-card'], borderCurve: 'continuous', overflow: 'hidden' },
  chip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: vars['--space-3'],
    alignItems: 'center',
  },
});

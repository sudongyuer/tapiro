import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BountyMapView, type BountyMapCamera, type BountyMapPin } from 'tapiro-kit';

import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';
import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { categoryArt } from '@/ui/categoryArt';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

type Fixture = {
  id: string;
  category: BountyCategory;
  title: string;
  reward: string;
  north: number;
  east: number;
};

const FIXTURES: Fixture[] = [
  { id: 'p1', category: 'pickup', title: '帮取快递', reward: 'RM 8', north: 600, east: 250 },
  { id: 'p2', category: 'buy', title: '带杯奶茶', reward: 'RM 6', north: 600, east: 250 },
  { id: 'p3', category: 'queue', title: '帮排签证', reward: 'RM 30', north: 420, east: -310 },
  { id: 'p4', category: 'handle', title: '代交表格', reward: 'RM 15', north: -380, east: 520 },
  { id: 'p5', category: 'move', title: '搬两个箱子', reward: 'RM 40', north: 900, east: 640 },
  { id: 'p6', category: 'accompany', title: '陪去医院', reward: 'RM 25', north: -820, east: -560 },
  { id: 'p7', category: 'study', title: '讲微积分', reward: 'RM 50', north: 1300, east: -150 },
  { id: 'p8', category: 'other', title: '帮喂猫', reward: 'RM 10', north: -1350, east: 220 },
  { id: 'p9', category: 'buy', title: '代买文具', reward: 'RM 12', north: 250, east: 1500 },
  { id: 'p10', category: 'pickup', title: '取外卖', reward: 'RM 5', north: -150, east: -1450 },
];

const SHARED = new Set(['p1', 'p2']);
const METERS_PER_DEGREE = 111_320;

function offset(north: number, east: number) {
  const latitude = SUNWAY_PYRAMID.latitude + north / METERS_PER_DEGREE;
  const scale = Math.cos((SUNWAY_PYRAMID.latitude * Math.PI) / 180);
  return { latitude, longitude: SUNWAY_PYRAMID.longitude + east / (METERS_PER_DEGREE * scale) };
}

export function MapKitScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [event, setEvent] = useState('-');
  const [originKind, setOriginKind] = useState<'me' | 'place'>('place');
  const round = useRef(0);
  const [camera, setCamera] = useState<BountyMapCamera>({
    originKey: 'camera-0',
    ...SUNWAY_PYRAMID,
    radiusM: 2000,
  });
  useEffect(onReady, [onReady]);

  const pins: BountyMapPin[] = FIXTURES.map((fixture) => {
    const label = t(`bounty.category.${fixture.category}`);
    return {
      id: fixture.id,
      point: offset(fixture.north, fixture.east),
      label,
      a11yLabel: t('bounty.board.card.label', {
        category: label,
        title: fixture.title,
        reward: fixture.reward,
      }),
      art: categoryArt(fixture.category, theme),
      fan: SHARED.has(fixture.id)
        ? { index: fixture.id === 'p1' ? 0 : 1, of: SHARED.size }
        : { index: 0, of: 1 },
    };
  });

  const recentre = (radiusM: number) => {
    round.current += 1;
    setCamera({ originKey: `camera-${round.current}`, ...SUNWAY_PYRAMID, radiusM });
  };

  return (
    <View style={styles.root}>
      <BountyMapView
        style={styles.map}
        testID="map-kit-map"
        pins={pins}
        selectedId={selectedId}
        origin={{ ...SUNWAY_PYRAMID, kind: originKind, title: t('bounty.board.axis.here') }}
        camera={camera}
        onPinPress={({ id, x, y }) => {
          setSelectedId(id);
          setEvent(`pin ${id} ${Math.round(x)},${Math.round(y)}`);
        }}
        onMapPress={() => {
          setSelectedId(undefined);
          setEvent('map');
        }}
        onRegionChange={() => {
          setSelectedId(undefined);
          setEvent('region');
        }}
      />
      <View style={styles.controls}>
        <AppText variant="secondary" testID="map-kit-event">
          {event}
        </AppText>
        <View style={styles.row}>
          <PillButton
            label={t('debug.map.near')}
            variant="secondary"
            testID="map-kit-near"
            onPress={() => recentre(2000)}
          />
          <PillButton
            label={t('debug.map.far')}
            variant="secondary"
            testID="map-kit-far"
            onPress={() => recentre(8000)}
          />
          <PillButton
            label={t(originKind === 'place' ? 'debug.map.me' : 'debug.map.place')}
            variant="secondary"
            testID="map-kit-origin"
            onPress={() => setOriginKind((kind) => (kind === 'place' ? 'me' : 'place'))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  controls: { padding: vars['--space-4'], gap: vars['--space-3'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
});

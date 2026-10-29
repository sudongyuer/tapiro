import { useImage } from 'expo-image';
import { AppleMaps } from 'expo-maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pointAt } from '@/features/bounty/board/fixtureBoardData';
import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

const PINS = [
  { id: 'b01', art: 'pickup', meters: 300, bearing: 160, title: '帮取快递' },
  { id: 'b02', art: 'buy', meters: 500, bearing: 40, title: '帮我买杯奶茶' },
  { id: 'b03', art: 'accompany', meters: 800, bearing: 250, title: '陪我去银行开户' },
  { id: 'b04', art: 'handle', meters: 900, bearing: 320, title: '帮忙打印论文' },
  { id: 'b05', art: 'queue', meters: 1200, bearing: 100, title: '帮忙排队领证件' },
  { id: 'b06', art: 'move', meters: 1500, bearing: 200, title: '搬家帮手' },
  { id: 'b07', art: 'study', meters: 1800, bearing: 10, title: '讲一下微积分' },
  { id: 'b08', art: 'other', meters: 2600, bearing: 290, title: '更远的一单' },
  { id: 'b09', art: 'wide', meters: 650, bearing: 130, title: '非正方形图' },
  { id: 'b10', art: 'buy', meters: 300, bearing: 160, title: '同一格的第二单' },
] as const;

const ART = {
  pickup: require('../../assets/spike-map/sticker-pickup.png'),
  buy: require('../../assets/spike-map/sticker-buy.png'),
  queue: require('../../assets/spike-map/sticker-queue.png'),
  handle: require('../../assets/spike-map/sticker-handle.png'),
  move: require('../../assets/spike-map/sticker-move.png'),
  accompany: require('../../assets/spike-map/sticker-accompany.png'),
  study: require('../../assets/spike-map/sticker-study.png'),
  other: require('../../assets/spike-map/sticker-other.png'),
  wide: require('../../assets/spike-map/sticker-wide.png'),
};

function useArt() {
  return {
    pickup: useImage(ART.pickup),
    buy: useImage(ART.buy),
    queue: useImage(ART.queue),
    handle: useImage(ART.handle),
    move: useImage(ART.move),
    accompany: useImage(ART.accompany),
    study: useImage(ART.study),
    other: useImage(ART.other),
    wide: useImage(ART.wide),
  };
}

export function MapSpikeScene({ onReady }: { onReady: () => void }) {
  const insets = useSafeAreaInsets();
  const map = useRef<AppleMaps.MapView>(null);
  const mountedAt = useRef(Date.now());
  const art = useArt();
  const loaded = Object.values(art).every(Boolean);
  const [log, setLog] = useState<string[]>([]);
  const [firstCamera, setFirstCamera] = useState<number | null>(null);
  const [taps, setTaps] = useState(0);
  const [mapTaps, setMapTaps] = useState(0);
  useEffect(onReady, [onReady]);

  const annotations = useMemo(
    () =>
      loaded
        ? PINS.map((pin) => ({
            id: pin.id,
            coordinates: pointAt(SUNWAY_PYRAMID, pin.meters, pin.bearing),
            title: pin.id <= 'b03' ? `${pin.title} RM 8` : '',
            text: pin.id === 'b10' ? '2' : '',
            textColor: '#B4432F',
            icon: art[pin.art] ?? undefined,
          }))
        : [],
    [loaded, art],
  );

  const push = (line: string) =>
    setLog((current) => [`${Date.now() - mountedAt.current}ms ${line}`, ...current].slice(0, 4));

  return (
    <View style={styles.screen} testID="map-spike">
      <AppleMaps.View
        ref={map}
        style={StyleSheet.absoluteFill}
        cameraPosition={{ coordinates: SUNWAY_PYRAMID, zoom: 14.5 }}
        annotations={annotations}
        properties={{ isMyLocationEnabled: true, selectionEnabled: false }}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false }}
        onAnnotationClick={(event) => {
          setTaps((count) => count + 1);
          push(`annotation ${event.id}`);
        }}
        onMapClick={() => {
          setMapTaps((count) => count + 1);
          push('map');
        }}
        onCameraMove={(event) => {
          setFirstCamera((current) => current ?? Date.now() - mountedAt.current);
          push(`camera z${event.zoom.toFixed(1)}`);
        }}
      />
      <View style={[styles.panel, { top: insets.top + vars['--space-2'] }]} pointerEvents="box-none">
        <AppText variant="meta" testID="map-spike-status" accessible>
          {`pins ${annotations.length} · firstCamera ${firstCamera ?? '-'}ms · annTaps ${taps} · mapTaps ${mapTaps}`}
        </AppText>
        <AppText variant="meta" testID="map-spike-log" accessible>
          {log.join('\n') || 'no events'}
        </AppText>
        <View style={styles.row}>
          <Pressable
            testID="map-spike-select"
            accessibilityRole="button"
            accessibilityLabel="select b03"
            style={styles.button}
            onPress={() => map.current?.selectAnnotation('b03', { moveCamera: true })}
          >
            <AppText variant="meta">select b03</AppText>
          </Pressable>
          <Pressable
            testID="map-spike-camera"
            accessibilityRole="button"
            accessibilityLabel="camera far"
            style={styles.button}
            onPress={() =>
              map.current?.setCameraPosition({ coordinates: SUNWAY_PYRAMID, zoom: 12 })
            }
          >
            <AppText variant="meta">camera z12</AppText>
          </Pressable>
          <Pressable
            testID="map-spike-clear"
            accessibilityRole="button"
            accessibilityLabel="clear selection"
            style={styles.button}
            onPress={() => map.current?.selectAnnotation(undefined)}
          >
            <AppText variant="meta">clear</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: {
    position: 'absolute',
    left: vars['--space-3'],
    right: vars['--space-3'],
    gap: vars['--space-1'],
    padding: vars['--space-2'],
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  row: { flexDirection: 'row', gap: vars['--space-2'] },
  button: {
    minHeight: 44,
    paddingHorizontal: vars['--space-3'],
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});

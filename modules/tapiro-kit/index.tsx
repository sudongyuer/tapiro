import { NativeModule, requireNativeModule, requireNativeView } from 'expo';
import type { ReactNode } from 'react';
import type { NativeSyntheticEvent, StyleProp, ViewProps, ViewStyle } from 'react-native';

export type PlacePoint = { latitude: number; longitude: number };
export type PlaceSuggestion = { id: string; title: string; subtitle: string };
export type PlaceSuggestionsEvent =
  | { searchId: string; requestId: string; status: 'ok'; items: PlaceSuggestion[] }
  | { searchId: string; requestId: string; status: 'failed'; code: 'network' | 'unknown' };
export type ResolvedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
};
export type PlaceResult =
  | { status: 'ok'; place: ResolvedPlace }
  | { status: 'notFound' | 'failed'; code?: 'network' | 'unknown' | 'stale' };

export type StickerFlightOptions = {
  viewTag: number;
  anchorTag?: number;
  tabId: string;
  reduceMotion: boolean;
  badge?: string;
  badgeColor?: string;
  badgeInk?: string;
};
export type StickerFlightResult = { landed: boolean };

export type BountyMapPin = {
  id: string;
  point: PlacePoint;
  label: string;
  a11yLabel: string;
  art: { color: string; ink: string; symbol: string };
  fan: { index: number; of: number };
};
export type BountyMapOrigin = PlacePoint & { kind: 'me' | 'place'; title: string };
export type BountyMapCamera = PlacePoint & { originKey: string; radiusM: number };
export type BountyMapPinPress = { id: string; x: number; y: number };
export type BountyMapRegion = PlacePoint & { radiusM: number };
export type BountyMapViewProps = {
  pins: BountyMapPin[];
  selectedId?: string;
  origin: BountyMapOrigin | null;
  camera: BountyMapCamera;
  onPinPress(event: BountyMapPinPress): void;
  onMapPress(): void;
  onRegionChange(): void;
  onCameraChange?(region: BountyMapRegion): void;
  expandLabel?: string;
  onExpand?(): void;
  locateButton?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type TapiroKitEvents = {
  onPlaceSuggestions(event: PlaceSuggestionsEvent): void;
};

declare class TapiroKitModule extends NativeModule<TapiroKitEvents> {
  qrImageFile(payload: string, points: number): Promise<string | null>;
  startPlaceSearch(latitude: number | null, longitude: number | null): string;
  updatePlaceQuery(searchId: string, query: string): string;
  endPlaceSearch(searchId: string): void;
  resolvePlace(searchId: string, suggestionId: string): Promise<PlaceResult>;
  placeAt(latitude: number, longitude: number): Promise<PlaceResult>;
  flyToTab(options: StickerFlightOptions): Promise<StickerFlightResult>;
}

const NativePinnedBar = requireNativeView<{ children: ReactNode }>('TapiroKit', 'PinnedBarView');

export function PinnedBar({ children }: { children: ReactNode }) {
  return <NativePinnedBar>{children}</NativePinnedBar>;
}

const NativeTitleHalo = requireNativeView<ViewProps>('TapiroKit', 'TitleHaloView');

const NativeBountyMap = requireNativeView<
  Omit<BountyMapViewProps, 'onPinPress' | 'selectedId' | 'onCameraChange' | 'expandLabel'> & {
    selectedId: string | null;
    expandLabel: string | null;
    onPinPress(event: NativeSyntheticEvent<BountyMapPinPress>): void;
    onCameraChange(event: NativeSyntheticEvent<BountyMapRegion>): void;
  }
>('TapiroKit', 'BountyMapView');

export function BountyMapView({
  onPinPress,
  onCameraChange,
  selectedId,
  expandLabel,
  ...props
}: BountyMapViewProps) {
  return (
    <NativeBountyMap
      {...props}
      selectedId={selectedId ?? null}
      expandLabel={expandLabel ?? null}
      onPinPress={(event) => onPinPress(event.nativeEvent)}
      onCameraChange={(event) => onCameraChange?.(event.nativeEvent)}
    />
  );
}

const kit = requireNativeModule<TapiroKitModule>('TapiroKit');

export function TitleHalo() {
  return <NativeTitleHalo pointerEvents="none" style={{ width: 0, height: 0 }} />;
}

export function qrImageFile(payload: string, points: number) {
  return kit.qrImageFile(payload, points);
}

export function startPlaceSearch(region: PlacePoint | null): string {
  return kit.startPlaceSearch(region?.latitude ?? null, region?.longitude ?? null);
}

export function updatePlaceQuery(searchId: string, query: string): string {
  return kit.updatePlaceQuery(searchId, query);
}

export function addPlaceSuggestionsListener(cb: (event: PlaceSuggestionsEvent) => void): {
  remove(): void;
} {
  return kit.addListener('onPlaceSuggestions', cb);
}

export function resolvePlace(searchId: string, suggestionId: string): Promise<PlaceResult> {
  return kit.resolvePlace(searchId, suggestionId);
}

export function placeAt(point: PlacePoint): Promise<PlaceResult> {
  return kit.placeAt(point.latitude, point.longitude);
}

export function endPlaceSearch(searchId: string): void {
  kit.endPlaceSearch(searchId);
}

export const StickerFlight = {
  flyToTab(options: StickerFlightOptions): Promise<StickerFlightResult> {
    return kit.flyToTab(options);
  },
};

import { NativeModule, requireNativeModule, requireNativeView } from 'expo';
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

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
export type PhotoStickerOptions = {
  uri: string;
  border?: 'dilate' | 'contour';
  maxSide?: number;
  cpuOnly?: boolean;
};
export type PhotoStickerResult =
  | {
      status: 'ok';
      uri: string;
      width: number;
      height: number;
      bytes: number;
      instances: number;
      visionMs: number;
      totalMs: number;
      inputWidth: number;
      inputHeight: number;
    }
  | { status: 'failed'; code: string; message: string };

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
  photoSticker(options: PhotoStickerOptions): Promise<PhotoStickerResult>;
  imagePlaygroundProbe(
    prompt: string,
    style: string,
    imageUri: string | null,
  ): Promise<Record<string, unknown>>;
}

const NativePinnedBar = requireNativeView<{ children: ReactNode }>('TapiroKit', 'PinnedBarView');

export function PinnedBar({ children }: { children: ReactNode }) {
  return <NativePinnedBar>{children}</NativePinnedBar>;
}

const NativeTitleHalo = requireNativeView<ViewProps>('TapiroKit', 'TitleHaloView');

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

export function photoSticker(options: PhotoStickerOptions): Promise<PhotoStickerResult> {
  return kit.photoSticker(options);
}

export function imagePlaygroundProbe(
  prompt: string,
  style: 'animation' | 'illustration' | 'sketch',
  imageUri: string | null,
): Promise<Record<string, unknown>> {
  return kit.imagePlaygroundProbe(prompt, style, imageUri);
}

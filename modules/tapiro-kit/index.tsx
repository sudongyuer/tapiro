import { NativeModule, requireNativeModule, requireNativeView } from 'expo';
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
  | { status: 'notFound' | 'failed'; code?: 'network' | 'unknown' };

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

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
  art: { color: string; ink: string; symbol: string; image: string };
  fan: { index: number; of: number };
  applied?: boolean;
  stamp?: { text: string; ink: string; fill: string };
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

export type StoreProduct = {
  id: string;
  displayName: string;
  displayPrice: string;
  price: number;
  currencyCode: string;
};
export type StoreFailureCode =
  | 'network'
  | 'cancelled'
  | 'notAvailable'
  | 'notEntitled'
  | 'system'
  | 'unsupported'
  | 'notAllowed'
  | 'unknownProduct'
  | 'invalidPurchase'
  | 'invalidToken'
  | 'noScene'
  | 'unknown';
export type StoreProductsResult =
  { status: 'ok'; products: StoreProduct[] } | { status: 'failed'; code: StoreFailureCode };
export type StoreTransaction = {
  source: 'purchase' | 'updates' | 'unfinished' | 'history';
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  jws: string;
  environment: string;
  appAccountToken: string;
  revoked: boolean;
  verified: boolean;
};
export type StorePurchaseResult =
  | { status: 'purchased'; transaction: StoreTransaction }
  | { status: 'pending' | 'cancelled' | 'notAllowed' }
  | { status: 'failed'; code: StoreFailureCode };

export type LiveActivityState = {
  title: string;
  detail: string;
  minutes?: number;
  unit: string;
  progress: number;
  startLabel: string;
  endLabel: string;
  staleNote: string;
  staleAfterSeconds?: number;
};
export type LiveActivityStartResult =
  | { status: 'ok'; id: string }
  | { status: 'disabled' }
  | {
      status: 'failed';
      code:
        'unsupported' | 'disabled' | 'tooMany' | 'tooLarge' | 'unentitled' | 'failed' | 'unknown';
    };
export type LiveActivityChangeResult = { status: 'ok' | 'notFound' };
export type LiveActivityInfo = { id: string; kind: string; state: string };

type TapiroKitEvents = {
  onPlaceSuggestions(event: PlaceSuggestionsEvent): void;
  onStoreTransaction(event: StoreTransaction): void;
};

declare class TapiroKitModule extends NativeModule<TapiroKitEvents> {
  qrImageFile(payload: string, points: number): Promise<string | null>;
  startPlaceSearch(latitude: number | null, longitude: number | null): string;
  updatePlaceQuery(searchId: string, query: string): string;
  endPlaceSearch(searchId: string): void;
  resolvePlace(searchId: string, suggestionId: string): Promise<PlaceResult>;
  placeAt(latitude: number, longitude: number): Promise<PlaceResult>;
  flyToTab(options: StickerFlightOptions): Promise<StickerFlightResult>;
  resignFocus(): Promise<void>;
  liveActivityStart(
    kind: string,
    link: string | null,
    state: LiveActivityState,
  ): Promise<LiveActivityStartResult>;
  liveActivityUpdate(id: string, state: LiveActivityState): Promise<LiveActivityChangeResult>;
  liveActivityEnd(
    id: string,
    state: LiveActivityState | null,
    dismissAfterSeconds: number,
  ): Promise<LiveActivityChangeResult>;
  liveActivityList(): Promise<LiveActivityInfo[]>;
  storeProducts(ids: string[]): Promise<StoreProductsResult>;
  storePurchase(productId: string, accountToken: string): Promise<StorePurchaseResult>;
  storeUnfinished(): Promise<StoreTransaction[]>;
  storeRevoked(): Promise<StoreTransaction[]>;
  storeFinish(transactionId: string): Promise<boolean>;
  storeStartUpdates(): Promise<void>;
  storeStopUpdates(): Promise<void>;
}

const NativePinnedBar = requireNativeView<{ children: ReactNode }>('TapiroKit', 'PinnedBarView');

export function PinnedBar({ children }: { children: ReactNode }) {
  return <NativePinnedBar>{children}</NativePinnedBar>;
}

export type ContextMenuAction = {
  id: string;
  title: string;
  systemImage?: string;
  destructive?: boolean;
  separate?: boolean;
};

type NativeContextMenuProps = ViewProps & {
  actions: ContextMenuAction[];
  cornerRadius?: number;
  onAction(event: NativeSyntheticEvent<{ id: string }>): void;
};

const NativeContextMenu = requireNativeView<NativeContextMenuProps>('TapiroKit', 'ContextMenuView');

export function ContextMenuView({
  actions,
  cornerRadius,
  onAction,
  ...props
}: ViewProps & {
  actions: ContextMenuAction[];
  cornerRadius?: number;
  onAction(id: string): void;
}) {
  return (
    <NativeContextMenu
      {...props}
      actions={actions}
      cornerRadius={cornerRadius}
      onAction={(event) => onAction(event.nativeEvent.id)}
    />
  );
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

export function resignFocus(): Promise<void> {
  return kit.resignFocus();
}

export function endPlaceSearch(searchId: string): void {
  kit.endPlaceSearch(searchId);
}

export const StickerFlight = {
  flyToTab(options: StickerFlightOptions): Promise<StickerFlightResult> {
    return kit.flyToTab(options);
  },
};

export const Store = {
  products(ids: string[]): Promise<StoreProductsResult> {
    return kit.storeProducts(ids);
  },
  purchase(productId: string, accountToken: string): Promise<StorePurchaseResult> {
    return kit.storePurchase(productId, accountToken);
  },
  unfinished(): Promise<StoreTransaction[]> {
    return kit.storeUnfinished();
  },
  revoked(): Promise<StoreTransaction[]> {
    return kit.storeRevoked();
  },
  finish(transactionId: string): Promise<boolean> {
    return kit.storeFinish(transactionId);
  },
  listen(cb: (transaction: StoreTransaction) => void): { remove(): void } {
    const subscription = kit.addListener('onStoreTransaction', cb);
    void kit.storeStartUpdates();
    return {
      remove() {
        subscription.remove();
        void kit.storeStopUpdates();
      },
    };
  },
};

export const LiveActivity = {
  start(kind: string, link: string | null, state: LiveActivityState) {
    return kit.liveActivityStart(kind, link, state);
  },
  update(id: string, state: LiveActivityState): Promise<LiveActivityChangeResult> {
    return kit.liveActivityUpdate(id, state);
  },
  end(id: string, state: LiveActivityState | null, dismissAfterSeconds: number) {
    return kit.liveActivityEnd(id, state, dismissAfterSeconds);
  },
  list(): Promise<LiveActivityInfo[]> {
    return kit.liveActivityList();
  },
};

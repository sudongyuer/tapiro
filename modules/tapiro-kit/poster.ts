import { NativeModule, requireNativeModule } from 'expo';

export type PosterSnapshotResult =
  | { status: 'ok'; uri: string; width: number; height: number }
  | { status: 'failed'; code: 'noView' | 'notShown' | 'encode' | 'write' };

declare class PosterKit extends NativeModule {
  snapshotPoster(viewTag: number): Promise<PosterSnapshotResult>;
}

const kit = requireNativeModule<PosterKit>('TapiroKit');

export function snapshotPoster(viewTag: number): Promise<PosterSnapshotResult> {
  return kit.snapshotPoster(viewTag);
}

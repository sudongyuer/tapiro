import { requireNativeModule, requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

const NativeTitleHalo = requireNativeView<ViewProps>('TapiroKit', 'TitleHaloView');

type TapiroKitModule = {
  qrImageFile(payload: string, points: number): Promise<string | null>;
};

const kit = requireNativeModule<TapiroKitModule>('TapiroKit');

export function TitleHalo() {
  return <NativeTitleHalo pointerEvents="none" style={{ width: 0, height: 0 }} />;
}

export function qrImageFile(payload: string, points: number) {
  return kit.qrImageFile(payload, points);
}

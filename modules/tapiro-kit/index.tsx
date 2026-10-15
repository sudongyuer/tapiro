import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

const NativeTitleHalo = requireNativeView<ViewProps>('TapiroKit', 'TitleHaloView');

export function TitleHalo() {
  return <NativeTitleHalo pointerEvents="none" style={{ width: 0, height: 0 }} />;
}

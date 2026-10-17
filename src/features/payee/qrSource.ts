import { CameraView, scanFromURLAsync } from 'expo-camera';
import { File } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { FIXTURE_QR } from './qrFixtures';

export type PickResult =
  { status: 'decoded'; payloads: string[] } | { status: 'cancelled' } | { status: 'failed' };

export type ScanStart =
  { status: 'started'; stop: () => void } | { status: 'denied' } | { status: 'unavailable' };

export type QrSource = {
  pickScreenshot(): Promise<PickResult>;
  startScan(
    requestPermission: () => Promise<{ granted: boolean }>,
    onDecoded: (payloads: string[]) => void,
  ): Promise<ScanStart>;
};

// The picker returns a copy in the app cache; deleting it keeps no screenshot on the device.
function discard(uri: string) {
  try {
    new File(uri).delete();
  } catch {}
}

export const deviceQrSource: QrSource = {
  async pickScreenshot() {
    try {
      const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const uri = picked.canceled ? null : picked.assets[0]?.uri;
      if (!uri) return { status: 'cancelled' };
      try {
        const codes = await scanFromURLAsync(uri, ['qr']);
        return { status: 'decoded', payloads: codes.map((code) => code.data) };
      } finally {
        discard(uri);
      }
    } catch {
      return { status: 'failed' };
    }
  },

  async startScan(requestPermission, onDecoded) {
    const permission = await requestPermission();
    if (!permission.granted) return { status: 'denied' };
    if (!CameraView.isModernBarcodeScannerAvailable) return { status: 'unavailable' };
    const subscription = CameraView.onModernBarcodeScanned((event) => {
      subscription.remove();
      CameraView.dismissScanner().catch(() => {});
      onDecoded([event.data]);
    });
    try {
      await CameraView.launchScanner({ barcodeTypes: ['qr'], isHighlightingEnabled: true });
    } catch {
      subscription.remove();
      return { status: 'unavailable' };
    }
    return { status: 'started', stop: () => subscription.remove() };
  },
};

export function fixtureQrSource(scans: string | undefined): QrSource {
  const queue = (scans ?? 'duitnow').split(',');
  let next = 0;
  const take = () => {
    const name = queue[Math.min(next, queue.length - 1)];
    next += 1;
    return FIXTURE_QR.scans[name] ?? [];
  };
  return {
    async pickScreenshot() {
      return { status: 'decoded', payloads: take() };
    },
    async startScan(_requestPermission, onDecoded) {
      onDecoded(take());
      return { status: 'started', stop: () => {} };
    },
  };
}

import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { qrImageFile } from 'tapiro-kit';

import { uiVerify } from '@/lib/uiVerify';

export const readReceiptBytes = (uri: string) => new File(uri).arrayBuffer();

export const fixtureReceiptImage = () => qrImageFile('Tapiro fixture Grab receipt', 240);

export async function pickReceipt(): Promise<string | null> {
  if (uiVerify) return 'file:///fixture/receipt.jpg';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { qrImageFile } from 'tapiro-kit';

export type PayDevice = {
  copy(text: string): Promise<void>;
  qrImage(payload: string, points: number): Promise<string | null>;
  saveToPhotos(fileUri: string): Promise<boolean>;
  open(url: string): Promise<boolean>;
  pickProof(): Promise<string | null>;
};

export const readFileBytes = (uri: string) => new File(uri).arrayBuffer();

function removeFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
    return true;
  } catch {
    return false;
  }
}

export const devicePay: PayDevice = {
  async copy(text) {
    await Clipboard.setStringAsync(text);
  },
  qrImage: qrImageFile,
  async saveToPhotos(fileUri) {
    try {
      const { granted } = await requestPermissionsAsync(true);
      if (!granted) return false;
      await Asset.create(fileUri);
      return true;
    } catch {
      return false;
    } finally {
      removeFile(fileUri);
    }
  },
  async open(url) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  },
  async pickProof() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  },
};

export function fixturePay(): PayDevice & { saved: string[]; copied: string[] } {
  const saved: string[] = [];
  const copied: string[] = [];
  return {
    saved,
    copied,
    async copy(text) {
      copied.push(text);
      await Clipboard.setStringAsync(text);
    },
    qrImage: qrImageFile,
    async saveToPhotos(fileUri) {
      saved.push(fileUri);
      removeFile(fileUri);
      return true;
    },
    async open() {
      return false;
    },
    async pickProof() {
      return 'file:///fixture/proof.jpg';
    },
  };
}

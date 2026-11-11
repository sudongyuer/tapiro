import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import type { CloudImage } from './cloudGate';

export type ScreenshotPick =
  { kind: 'picked'; image: CloudImage } | { kind: 'cancelled' | 'failed' };

const MAX_EDGE = 1280;
const QUALITY = 0.6;
const DATA_MAX = 1_400_000;
const FIXTURE_JPEG = '/9j/4AAQSkZJRg==';

async function encode(uri: string, width: number, height: number): Promise<ScreenshotPick> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const size = {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
  const rendered = await ImageManipulator.manipulate(uri).resize(size).renderAsync();
  try {
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: QUALITY,
      base64: true,
    });
    const data = saved.base64 ?? '';
    if (data === '' || data.length > DATA_MAX) return { kind: 'failed' };
    return { kind: 'picked', image: { mediaType: 'image/jpeg', data } };
  } finally {
    rendered.release();
  }
}

export async function pickScreenshot(): Promise<ScreenshotPick> {
  if (uiVerify) {
    return uiVerifyArgument('uiVerifyAskPick') === 'cancelled'
      ? { kind: 'cancelled' }
      : { kind: 'picked', image: { mediaType: 'image/jpeg', data: FIXTURE_JPEG } };
  }
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return { kind: 'cancelled' };
    return await encode(asset.uri, asset.width, asset.height);
  } catch {
    return { kind: 'failed' };
  }
}

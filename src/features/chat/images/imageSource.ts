import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { qrImageFile } from 'tapiro-kit';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { cacheImageFile } from './imageFiles';

export type PickedImage = { uri: string; width: number; height: number };
export type PickOutcome =
  { kind: 'picked'; image: PickedImage } | { kind: 'cancelled' | 'denied' | 'unavailable' };

export type ImageSource = {
  pickPhoto(): Promise<PickOutcome>;
  takePhoto(): Promise<PickOutcome>;
};

const FIXTURE_SIZES = {
  photo: [1536, 2048],
  landscape: [2048, 1536],
  wide: [2048, 400],
  tall: [600, 3000],
  tiny: [24, 24],
} as const;
type FixtureKind = keyof typeof FIXTURE_SIZES;

const fixtureKind = (value: string | undefined): FixtureKind | null =>
  value && Object.hasOwn(FIXTURE_SIZES, value) ? (value as FixtureKind) : null;

export const fixtureImagePath = (kind: FixtureKind) => `fixture/${kind}.jpg`;

async function drawFixture(kind: FixtureKind, target: File) {
  const qr = await qrImageFile(`Tapiro fixture ${kind}`, 320);
  if (!qr) throw new Error('fixture image failed');
  const [width, height] = FIXTURE_SIZES[kind];
  const rendered = await ImageManipulator.manipulate(qr).resize({ width, height }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  new File(saved.uri).moveSync(target);
}

export async function fixtureImageFile(path: string) {
  const kind = fixtureKind(/^fixture\/(\w+)\.jpg$/.exec(path)?.[1]);
  if (!kind) throw new Error(`no fixture image ${path}`);
  return cacheImageFile(path, (target) => drawFixture(kind, target));
}

async function fixturePick(argument: string): Promise<PickOutcome> {
  const value = uiVerifyArgument(argument);
  if (value === 'denied' || value === 'cancelled' || value === 'unavailable')
    return { kind: value };
  const kind = fixtureKind(value) ?? 'photo';
  const [width, height] = FIXTURE_SIZES[kind];
  return {
    kind: 'picked',
    image: { uri: await fixtureImageFile(fixtureImagePath(kind)), width, height },
  };
}

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

function outcome(result: ImagePicker.ImagePickerResult): PickOutcome {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { kind: 'cancelled' };
  return { kind: 'picked', image: { uri: asset.uri, width: asset.width, height: asset.height } };
}

const deviceSource: ImageSource = {
  async pickPhoto() {
    return outcome(await ImagePicker.launchImageLibraryAsync(OPTIONS));
  },
  async takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
    try {
      return outcome(await ImagePicker.launchCameraAsync(OPTIONS));
    } catch {
      return { kind: 'unavailable' };
    }
  },
};

const verifySource: ImageSource = {
  pickPhoto: () => fixturePick('uiVerifyChatPick'),
  takePhoto: () => fixturePick('uiVerifyChatCamera'),
};

export const imageSource = uiVerify ? verifySource : deviceSource;

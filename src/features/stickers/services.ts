import { File } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Share } from 'react-native';
import { snapshotPoster } from 'tapiro-kit';

import { sessionEnds } from '@/lib/sessionEnds';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createBookFocus } from './bookFocus';

export const bookFocus = createBookFocus();
sessionEnds.register(() => bookFocus.clear());

export type SaveOutcome = 'saved' | 'denied' | 'failed';
export type ShareOutcome = 'shared' | 'dismissed' | 'failed';

export type PosterDevice = {
  save(viewTag: number): Promise<SaveOutcome>;
  share(viewTag: number): Promise<ShareOutcome>;
};

function removeFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {}
}

async function snapshot(viewTag: number) {
  try {
    const result = await snapshotPoster(viewTag);
    return result.status === 'ok' ? result.uri : null;
  } catch {
    return null;
  }
}

const devicePoster: PosterDevice = {
  async save(viewTag) {
    const uri = await snapshot(viewTag);
    if (!uri) return 'failed';
    try {
      const { granted } = await requestPermissionsAsync(true);
      if (!granted) return 'denied';
      await Asset.create(uri);
      return 'saved';
    } catch {
      return 'failed';
    } finally {
      removeFile(uri);
    }
  },
  async share(viewTag) {
    const uri = await snapshot(viewTag);
    if (!uri) return 'failed';
    try {
      const result = await Share.share({ url: uri });
      return result.action === Share.sharedAction ? 'shared' : 'dismissed';
    } catch {
      return 'failed';
    } finally {
      removeFile(uri);
    }
  },
};

function fixturePoster(outcome: string | undefined): PosterDevice {
  const settle = async (viewTag: number) => {
    const uri = await snapshot(viewTag);
    if (uri) removeFile(uri);
    return uri !== null && outcome !== 'failed';
  };
  return {
    async save(viewTag) {
      if (outcome === 'denied') return 'denied';
      return (await settle(viewTag)) ? 'saved' : 'failed';
    },
    async share(viewTag) {
      return (await settle(viewTag)) ? 'shared' : 'failed';
    },
  };
}

export const posterDevice = uiVerify
  ? fixturePoster(uiVerifyArgument('uiVerifyPosterSave'))
  : devicePoster;

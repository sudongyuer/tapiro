import { Image } from 'expo-image';

import { handArtFor, type ArtSource, type HandArtId } from '@/lib/handArt';

import { HAND_ART_IMAGES } from './handArtImages';
import { StickerShadow } from './StickerArt';

export function HandArt({ id, size, testID }: { id: HandArtId; size: number; testID?: string }) {
  return (
    <StickerShadow>
      <Image
        source={HAND_ART_IMAGES[id]}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessible={false}
        testID={testID}
      />
    </StickerShadow>
  );
}

export function HandArtSticker({ source, size }: { source: ArtSource; size: number }) {
  return <HandArt id={handArtFor(source)} size={size} />;
}

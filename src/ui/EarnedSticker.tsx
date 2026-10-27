import { View } from 'react-native';

import type { StickerArt } from '@/lib/stickers';

import { CategorySticker } from './CategorySticker';
import { Mascot } from './Mascot';
import { ObjectSticker } from './ObjectSticker';
import { StickerShadow } from './StickerArt';

export function EarnedSticker({ art, width }: { art: StickerArt; width: number }) {
  if (art.kind === 'car') return <ObjectSticker kind="car" width={width} />;
  if (art.kind === 'category') return <CategorySticker category={art.category} size={width} />;
  return (
    <StickerShadow>
      <View style={{ width, height: (width * 80) / 96, alignItems: 'center' }}>
        <Mascot variant="front" size={(width * 80) / 96} outlined />
      </View>
    </StickerShadow>
  );
}

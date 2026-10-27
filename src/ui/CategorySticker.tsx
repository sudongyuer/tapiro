import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { BountyCategory } from '@/lib/stickers';

import { ParcelArt, StickerShadow } from './StickerArt';
import { vars, type TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type StickerCategory = BountyCategory;

const SYMBOLS: Record<Exclude<StickerCategory, 'pickup'>, SFSymbol> = {
  buy: 'bag.fill',
  queue: 'person.3.fill',
  handle: 'doc.text.fill',
  move: 'shippingbox.fill',
  accompany: 'figure.walk',
  study: 'book.fill',
  other: 'ellipsis',
};

export function CategorySticker({ category, size }: { category: StickerCategory; size: number }) {
  const { color } = useTheme();
  if (category === 'pickup') {
    return (
      <StickerShadow>
        <ParcelArt width={size} />
      </StickerShadow>
    );
  }
  const border = size >= 48 ? vars['--sticker-border'] : vars['--sticker-border-small'];
  const tile = size * 0.82;
  return (
    <StickerShadow>
      <View
        style={[
          styles.tile,
          {
            width: tile,
            height: tile,
            borderRadius: tile * 0.28,
            borderWidth: border,
            borderColor: color('--color-sticker-border'),
            backgroundColor: color(`--color-sticker-${category}` as TokenName),
          },
        ]}
      >
        <SymbolView
          name={SYMBOLS[category]}
          size={tile * 0.48}
          tintColor={color('--color-on-sticker')}
        />
      </View>
    </StickerShadow>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});

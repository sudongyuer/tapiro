import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { BountyCategory } from '@/lib/stickers';

import { CATEGORY_SYMBOLS, categoryColorToken } from './categoryArt';
import { ParcelArt, StickerShadow } from './StickerArt';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type StickerCategory = BountyCategory;

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
            backgroundColor: color(categoryColorToken(category)),
          },
        ]}
      >
        <SymbolView
          name={CATEGORY_SYMBOLS[category]}
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

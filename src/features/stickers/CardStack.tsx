import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { CARD_HEIGHT, cardSurface, DoneCard } from './DoneCard';

const CARD_MAX = 320;
const GUTTER = vars['--space-7'] * 2;
const BEHIND = [
  { rotate: '-5deg', translateX: -8, translateY: 6 },
  { rotate: '4deg', translateX: 7, translateY: 4 },
];

export function CardStack({ stickers, focusId }: { stickers: Sticker[]; focusId: string | null }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - GUTTER, CARD_MAX);
  const first = Math.max(
    0,
    stickers.findIndex((sticker) => sticker.id === focusId),
  );
  const [index, setIndex] = useState(first);
  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.wrap} testID="sticker-stack">
      <View style={styles.deck}>
        {BEHIND.slice(0, stickers.length - 1).map((tilt, layer) => (
          <View
            key={layer}
            style={[
              styles.behind,
              cardSurface(color),
              {
                width: cardWidth,
                left: (width - cardWidth) / 2,
                transform: [
                  { translateX: tilt.translateX },
                  { translateY: tilt.translateY },
                  { rotate: tilt.rotate },
                ],
              },
            ]}
          />
        ))}
        <FlatList
          data={stickers}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={first}
          getItemLayout={(_, at) => ({ length: width, offset: width * at, index: at })}
          onMomentumScrollEnd={onSettle}
          keyExtractor={(sticker) => sticker.id}
          renderItem={({ item, index: at }) => (
            <View style={[styles.page, { width }]}>
              <DoneCard sticker={item} width={cardWidth} testID={`sticker-card-${at}`} />
            </View>
          )}
        />
      </View>
      {stickers.length > 1 ? (
        <AppText
          variant="meta"
          tone="secondaryLabel"
          style={styles.center}
          testID="sticker-stack-position"
        >
          {`${t('stickers.card.position', { index: index + 1, total: stickers.length })} · ${t('stickers.card.hint')}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: vars['--space-4'], marginHorizontal: -vars['--space-5'] },
  deck: { height: CARD_HEIGHT + vars['--space-6'] },
  behind: {
    position: 'absolute',
    top: vars['--space-3'],
    height: CARD_HEIGHT,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: vars['--sticker-shadow-blur'],
  },
  page: { alignItems: 'center', paddingTop: vars['--space-3'] },
  center: { textAlign: 'center', paddingHorizontal: vars['--space-5'] },
});

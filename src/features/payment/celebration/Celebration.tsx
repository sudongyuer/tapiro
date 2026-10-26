import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { formatRinggit } from '@/lib/money';
import { stickerArt, type Sticker, type StickerKind } from '@/lib/stickers';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { formatCny } from '../fx';
import { BookPanel, type SlotCentre } from './BookPanel';
import { Headline } from './Headline';
import { bookSlots, targetSlot } from './model';
import { FlyingSticker, Receipt, STICKER_OFFSET } from './ReceiptSticker';
import { TIMELINE, tween } from './timeline';
import { useCelebrationClock } from './useCelebrationClock';

const RECEIPT_BELOW_HEADLINE = 66;

export type CelebrationData = {
  first: boolean;
  count: number | null;
  previous: Sticker[] | null;
  title: string;
  name: string;
  amountSen: number;
  cnyFen: number | null;
  itemKind: StickerKind;
  category: string | null;
};

export function Celebration({
  data,
  onDone,
  onOpenBook,
}: {
  data: CelebrationData;
  onDone: () => void;
  onOpenBook: () => void;
}) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const headlineTop = insets.top;
  const receiptTop = headlineTop + RECEIPT_BELOW_HEADLINE;
  const [width, setWidth] = useState(0);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [centre, setCentre] = useState<SlotCentre | null>(null);
  const amount = formatRinggit(data.amountSen, language);
  const announcement = t('pay.celebrate.announce', { amount, title: data.title, name: data.name });
  const ready = width > 0 && frame !== null && centre !== null;
  const { clock, skip, fadeStyle, buttonsLive } = useCelebrationClock(ready, announcement);
  const buttonsIn = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.buttons, 0, 1);
    return { opacity: p, transform: [{ translateY: 10 * (1 - p) }] };
  });
  const placed = data.count ?? (data.previous ? data.previous.length + 1 : 1);
  const target = targetSlot(placed);
  const start = { x: width / 2, y: receiptTop + STICKER_OFFSET };
  const bookTitle = t('stickers.book.title');
  const counts: [string, string] | null =
    data.count === null
      ? null
      : [
          t('stickers.count', { count: Math.max(data.count - 1, 0) }),
          t('stickers.count', { count: data.count }),
        ];

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onDone}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, fadeStyle]}
        testID="pay-celebration"
        accessibilityViewIsModal
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <Pressable style={styles.fill} onPress={skip} accessible={false}>
          <MomentBackground>
            <View style={styles.spacer} pointerEvents="none" />
            <BookPanel
              clock={clock}
              first={data.first}
              slots={bookSlots(placed, data.previous)}
              target={target}
              title={bookTitle}
              counts={counts}
              badge={t('pay.celebrate.badge')}
              countLabel={counts ? `${bookTitle} ${counts[1]}` : bookTitle}
              onFrame={setFrame}
              onTarget={setCentre}
            />
            <Animated.View
              pointerEvents={buttonsLive ? 'auto' : 'none'}
              style={[
                styles.buttons,
                { paddingBottom: insets.bottom + vars['--space-2'] },
                buttonsIn,
              ]}
            >
              <PillButton
                label={t('pay.celebrate.openBook')}
                variant="plain"
                onPress={onOpenBook}
                testID="pay-celebration-book-open"
              />
              <PillButton
                label={t('pay.celebrate.done')}
                onPress={onDone}
                testID="pay-celebration-done"
              />
            </Animated.View>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Receipt
                clock={clock}
                top={receiptTop}
                title={data.title}
                paid={t('pay.celebrate.receiptPaid', { name: data.name })}
                amount={amount}
              />
              {width > 0 ? (
                <FlyingSticker
                  clock={clock}
                  x={start.x}
                  y={start.y}
                  dx={frame && centre ? frame.x + centre.x - start.x : 0}
                  dy={frame && centre ? frame.y + centre.y - start.y : 0}
                  art={stickerArt(data)}
                />
              ) : null}
              <View style={[styles.headline, { top: headlineTop }]}>
                <Headline
                  clock={clock}
                  top={t('pay.celebrate.top', { title: data.title, name: data.name })}
                  amountSen={data.amountSen}
                  language={language}
                  cny={
                    data.cnyFen === null
                      ? null
                      : t('pay.celebrate.cny', { amount: formatCny(data.cnyFen, language) })
                  }
                  title={t(
                    data.first ? 'pay.celebrate.first.title' : 'pay.celebrate.routine.title',
                  )}
                  body={
                    data.first
                      ? t('pay.celebrate.first.body')
                      : data.count === null
                        ? t('pay.celebrate.first.body')
                        : t('pay.celebrate.routine.body', { count: data.count })
                  }
                  announcement={announcement}
                />
              </View>
            </View>
          </MomentBackground>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  spacer: { flex: 1 },
  buttons: {
    paddingHorizontal: vars['--space-6'],
    paddingTop: vars['--space-4'],
    gap: vars['--space-1'],
  },
  headline: { position: 'absolute', left: 0, right: 0 },
});

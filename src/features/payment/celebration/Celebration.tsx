import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from 'react-native';
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
import { TAPIR_RISE } from './BookTapir';
import { Headline } from './Headline';
import {
  bookSlots,
  celebrationBody,
  groupDrop,
  groupLayout,
  groupPoint,
  targetSlot,
} from './model';
import { FlyingSticker, Receipt, STICKER_OFFSET } from './ReceiptSticker';
import { TIMELINE, tween } from './timeline';
import { useCelebrationClock } from './useCelebrationClock';

const RECEIPT_TOP = vars['--space-4'];
const GROUP_GAP = { ideal: TAPIR_RISE + vars['--space-2'], min: TAPIR_RISE };

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
  const { height } = useWindowDimensions();
  const receiptTop = insets.top + RECEIPT_TOP;
  const [width, setWidth] = useState(0);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [centre, setCentre] = useState<SlotCentre | null>(null);
  const [stage, setStage] = useState<LayoutRectangle | null>(null);
  const [headlineHeight, setHeadlineHeight] = useState<number | null>(null);
  const amount = formatRinggit(data.amountSen, language);
  const announcement = t('pay.celebrate.announce', { amount, title: data.title, name: data.name });
  const layout =
    stage && frame && headlineHeight !== null
      ? groupLayout(stage.height, headlineHeight, frame.height, GROUP_GAP)
      : null;
  const ready = width > 0 && layout !== null && centre !== null;
  const { clock, skip, fadeStyle, buttonsLive } = useCelebrationClock(ready, announcement);
  const buttonsIn = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.buttons, 0, 1);
    return { opacity: p, transform: [{ translateY: 10 * (1 - p) }] };
  });
  const target = targetSlot(data.count);
  const body = celebrationBody(data.first, data.count);
  const start = { x: width / 2, y: receiptTop + STICKER_OFFSET };
  const end =
    stage && layout && frame && centre
      ? groupPoint(stage, layout, frame.x + centre.x, layout.height - frame.height + centre.y)
      : start;
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
            <View style={{ height: insets.top }} pointerEvents="none" />
            <View style={styles.stage} onLayout={(event) => setStage(event.nativeEvent.layout)}>
              <View style={{ transform: [{ scale: layout?.scale ?? 1 }] }}>
                <View onLayout={(event) => setHeadlineHeight(event.nativeEvent.layout.height)}>
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
                      body.key === 'pay.celebrate.routine.body'
                        ? t(body.key, { count: body.count })
                        : t(body.key)
                    }
                    announcement={announcement}
                  />
                </View>
                <View style={{ height: layout?.gap ?? GROUP_GAP.ideal }} pointerEvents="none" />
                <BookPanel
                  clock={clock}
                  first={data.first}
                  slots={bookSlots(data.count, data.previous)}
                  target={target}
                  drop={stage && layout ? groupDrop(stage, layout) : height}
                  title={bookTitle}
                  counts={counts}
                  badge={t('pay.celebrate.badge')}
                  countLabel={counts ? `${bookTitle} ${counts[1]}` : bookTitle}
                  onFrame={setFrame}
                  onTarget={setCentre}
                />
              </View>
            </View>
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
                  dx={end.x - start.x}
                  dy={end.y - start.y}
                  land={layout?.scale ?? 1}
                  art={stickerArt(data)}
                />
              ) : null}
            </View>
          </MomentBackground>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stage: { flex: 1, minHeight: 0, justifyContent: 'center' },
  buttons: {
    paddingHorizontal: vars['--space-6'],
    paddingTop: vars['--space-4'],
    gap: vars['--space-1'],
  },
});

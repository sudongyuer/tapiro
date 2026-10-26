import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { formatRinggit, formatRinggitParts } from '@/lib/money';
import { typeStyle, vars, type TypeRole } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { InkText } from '@/ui/InkText';
import { glyphs } from './model';
import { TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

const TURNS = 20;
const STACK = Array.from({ length: TURNS }, (_, index) => index % 10).join('\n');

function Column({
  digit,
  order,
  clock,
  variant,
  ink,
}: {
  digit: number;
  order: number;
  clock: Clock;
  variant: TypeRole;
  ink: string;
}) {
  const row = typeStyle(variant).lineHeight * useWindowDimensions().fontScale;
  const roll = useAnimatedStyle(() => {
    const { digits } = TIMELINE;
    const segment = {
      start: digits.start + order * digits.step,
      duration: digits.duration,
      curve: digits.curve,
    };
    return { transform: [{ translateY: -(10 + digit) * row * tween(clock.value, segment, 0, 1) }] };
  });
  return (
    <View style={[styles.window, { height: row }]}>
      <Animated.View style={[{ height: TURNS * row }, roll]}>
        <InkText variant={variant} outline={vars['--sticker-border']} ink={ink}>
          {STACK}
        </InkText>
      </Animated.View>
    </View>
  );
}

export function Odometer({
  amountSen,
  language,
  clock,
}: {
  amountSen: number;
  language: string;
  clock: Clock;
}) {
  const { color } = useTheme();
  const ink = color('--color-success');
  const { whole, cents } = formatRinggitParts(amountSen, language);
  const unit = formatRinggit(amountSen, language).replace(/[-\d.,\s]/g, '');
  const marks = [
    ...glyphs(whole).map((glyph) => ({ glyph, big: true })),
    ...glyphs(cents).map((glyph) => ({ glyph, big: false })),
  ];
  let order = 0;
  return (
    <>
      <InkText
        variant="title"
        outline={vars['--sticker-border-small']}
        ink={ink}
        style={styles.unit}
      >
        {unit}
      </InkText>
      {marks.map(({ glyph, big }, index) =>
        glyph.kind === 'digit' ? (
          <Column
            key={index}
            digit={glyph.digit}
            order={order++}
            clock={clock}
            variant={big ? 'amount-hero' : 'amount-compact'}
            ink={ink}
          />
        ) : (
          <InkText
            key={index}
            variant={big ? 'amount-hero' : 'amount-compact'}
            outline={vars['--sticker-border']}
            ink={ink}
          >
            {glyph.text}
          </InkText>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
  unit: {
    fontFamily: vars['--font-rounded'],
    fontWeight: '800',
    marginTop: vars['--space-2'],
    marginRight: vars['--space-1'],
  },
});

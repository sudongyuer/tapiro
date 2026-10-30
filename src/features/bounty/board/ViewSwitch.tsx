import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { StickerShadow } from '@/ui/StickerArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { BoardView } from './viewStore';

const TILT_DEG = -8;
const LIFT = 0.12;
const SPRING = { duration: 350, dampingRatio: 0.75 } as const;
const STICKER_HEIGHT = 30;
const SYMBOL_SIZE = 13;

const VIEWS = [
  { view: 'list', key: 'bounty.board.view.list', symbol: 'list.bullet' },
  { view: 'map', key: 'bounty.board.view.map', symbol: 'map.fill' },
] as const satisfies readonly { view: BoardView; key: string; symbol: SFSymbol }[];

export function ViewSwitch({
  view,
  reduceMotion,
  onChoose,
}: {
  view: BoardView;
  reduceMotion: boolean;
  onChoose: (view: BoardView) => void;
}) {
  const { t } = useI18n();
  return (
    <View
      accessibilityRole="tabbar"
      accessibilityLabel={t('bounty.board.view.a11y')}
      testID="bounty-view-switch"
      style={styles.row}
    >
      {VIEWS.map((item) => (
        <ViewSticker
          key={item.view}
          label={t(item.key)}
          symbol={item.symbol}
          selected={item.view === view}
          reduceMotion={reduceMotion}
          testID={`bounty-view-${item.view}`}
          onPress={() => onChoose(item.view)}
        />
      ))}
    </View>
  );
}

function ViewSticker({
  label,
  symbol,
  selected,
  reduceMotion,
  testID,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  selected: boolean;
  reduceMotion: boolean;
  testID: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    lift.set(
      withSpring(selected ? 1 : 0, {
        ...SPRING,
        reduceMotion: reduceMotion ? ReduceMotion.Always : ReduceMotion.System,
      }),
    );
  }, [lift, selected, reduceMotion]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lift.get() * TILT_DEG}deg` }, { scale: 1 + lift.get() * LIFT }],
  }));
  const ink = color(selected ? '--color-on-accent' : '--color-on-paper');
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={styles.target}
    >
      <Animated.View style={motion}>
        <StickerShadow>
          <View
            style={[
              styles.sticker,
              {
                borderColor: color('--color-sticker-border'),
                backgroundColor: color(selected ? '--color-accent' : '--color-paper'),
              },
            ]}
          >
            <SymbolView name={symbol} size={SYMBOL_SIZE} tintColor={ink} />
            <AppText variant="secondary" numberOfLines={1} style={[styles.label, { color: ink }]}>
              {label}
            </AppText>
          </View>
        </StickerShadow>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-1'] },
  target: {
    minWidth: vars['--touch-min'],
    minHeight: vars['--touch-min'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-1'],
    minHeight: STICKER_HEIGHT,
    paddingHorizontal: vars['--space-2'],
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    borderWidth: vars['--sticker-border-small'],
  },
  label: { fontWeight: '600' },
});

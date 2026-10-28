import { SymbolView } from 'expo-symbols';
import { PlatformColor, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { useSelectedUntilReturn } from '@/lib/useSelectedUntilReturn';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

const ICON = 20;
const CHEVRON = 14;

export function PlaceRow({ chosen, onPick }: { chosen: string | null; onPick: () => void }) {
  const { t } = useI18n();
  const ink = PlatformColor('secondaryLabel');
  const { selected, select, highlight } = useSelectedUntilReturn();
  const pick = () => {
    select();
    onPick();
  };
  const selection = <Animated.View pointerEvents="none" style={[styles.selection, highlight]} />;
  if (chosen === null) {
    const title = t('bounty.board.place.pick');
    const subtitle = t('bounty.board.place.pickSubtitle');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}\n${subtitle}`}
        accessibilityState={{ selected }}
        testID="bounty-place-row"
        onPress={pick}
        style={styles.row}
      >
        {({ pressed }) => (
          <>
            {pressed ? <View style={styles.selection} /> : selection}
            <SymbolView name="mappin.and.ellipse" size={ICON} tintColor={ink} />
            <RowText title={title} subtitle={subtitle} />
            <SymbolView
              name="chevron.right"
              size={CHEVRON}
              tintColor={PlatformColor('tertiaryLabel')}
            />
          </>
        )}
      </Pressable>
    );
  }
  const title = t('bounty.board.place.near', { place: chosen });
  const subtitle = t('bounty.board.place.nearSubtitle');
  return (
    <View style={styles.row}>
      {selection}
      <View
        accessible
        accessibilityLabel={`${title}\n${subtitle}`}
        testID="bounty-place-row"
        style={styles.chosen}
      >
        <SymbolView name="mappin.and.ellipse" size={ICON} tintColor={ink} />
        <RowText title={title} subtitle={subtitle} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bounty.board.place.change')}
        accessibilityState={{ selected }}
        testID="bounty-place-change"
        onPress={pick}
        style={({ pressed }) => [styles.change, pressed && styles.pressed]}
      >
        <AppText variant="body" style={styles.changeText}>
          {t('bounty.board.place.change')}
        </AppText>
      </Pressable>
    </View>
  );
}

function RowText({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.text}>
      <AppText variant="body" numberOfLines={2}>
        {title}
      </AppText>
      <AppText variant="meta" tone="secondaryLabel">
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  chosen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  text: { flex: 1, gap: 2 },
  change: {
    minWidth: vars['--touch-min'],
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
  },
  changeText: { fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: vars['--opacity-pressed'] },
  selection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('systemGray4'),
  },
});

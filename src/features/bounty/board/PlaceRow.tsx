import { SymbolView } from 'expo-symbols';
import { PlatformColor, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

const ICON = 20;
const CHEVRON = 14;

export function PlaceRow({ chosen, onPick }: { chosen: string | null; onPick: () => void }) {
  const { t } = useI18n();
  const ink = PlatformColor('secondaryLabel');
  if (chosen === null) {
    const title = t('bounty.board.place.pick');
    const subtitle = t('bounty.board.place.pickSubtitle');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}\n${subtitle}`}
        testID="bounty-place-row"
        onPress={onPick}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <SymbolView name="mappin.and.ellipse" size={ICON} tintColor={ink} />
        <RowText title={title} subtitle={subtitle} />
        <SymbolView
          name="chevron.right"
          size={CHEVRON}
          tintColor={PlatformColor('tertiaryLabel')}
        />
      </Pressable>
    );
  }
  const title = t('bounty.board.place.near', { place: chosen });
  const subtitle = t('bounty.board.place.nearSubtitle');
  return (
    <View style={styles.row}>
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
        testID="bounty-place-change"
        onPress={onPick}
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
});

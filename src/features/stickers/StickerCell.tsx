import { PlatformColor, StyleSheet, View } from 'react-native';

import { stickerArt, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { EarnedSticker } from '@/ui/EarnedSticker';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const ROTATIONS = [-5, 4, -3, 6, -4, 3, -6];
export const CELL_ART = 92;

export function StickerCell({
  sticker,
  index,
  date,
  label,
}: {
  sticker: Sticker;
  index: number;
  date: string;
  label: string;
}) {
  const { color } = useTheme();
  return (
    <View
      style={styles.cell}
      accessible
      accessibilityLabel={label}
      testID={`sticker-cell-${index}`}
    >
      <View style={{ transform: [{ rotate: `${ROTATIONS[index % ROTATIONS.length]}deg` }] }}>
        <EarnedSticker art={stickerArt(sticker)} width={CELL_ART} />
      </View>
      <View
        style={[
          styles.label,
          {
            backgroundColor: color('--color-receipt'),
            shadowColor: color('--color-sticker-shadow'),
          },
        ]}
      >
        <AppText
          variant="meta"
          numberOfLines={2}
          style={[styles.title, { color: color('--color-on-paper') }]}
        >
          {sticker.title}
        </AppText>
      </View>
      <AppText variant="meta" style={styles.date}>
        {date}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', gap: vars['--space-1'] + 2 },
  label: {
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    paddingHorizontal: vars['--space-2'],
    paddingVertical: 2,
    maxWidth: '100%',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  title: { fontWeight: '800', textAlign: 'center' },
  date: { color: PlatformColor('secondaryLabel') },
});

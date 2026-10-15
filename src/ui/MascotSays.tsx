import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Mascot } from './Mascot';
import { StickerShadow } from './StickerArt';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

const HEAD_SIZE = 32;

export function MascotSays({ line }: { line: string }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <StickerShadow>
        <Mascot variant="front" size={HEAD_SIZE} outlined />
      </StickerShadow>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: color('--color-stage-bubble'),
            shadowColor: color('--color-sticker-shadow'),
          },
        ]}
      >
        <AppText variant="secondary" style={[styles.say, { color: color('--color-on-stage') }]}>
          {line}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: vars['--space-2'] },
  bubble: {
    flexShrink: 1,
    borderRadius: vars['--radius-card'],
    borderBottomLeftRadius: vars['--space-1'],
    borderCurve: 'continuous',
    paddingVertical: vars['--space-2'],
    paddingHorizontal: vars['--space-3'],
    shadowOffset: { width: 0, height: vars['--space-1'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-2'],
  },
  say: { fontWeight: '700' },
});

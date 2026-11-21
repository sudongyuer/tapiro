import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const HEAD = 32;
const HIDE_GLYPH = 14;

export function SafetyCard({ onHide }: { onHide: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const text = t('chat.thread.safety');
  return (
    <View style={[styles.card, { backgroundColor: color('--color-moment-bg') }]}>
      <View accessible accessibilityLabel={text} testID="chat-safety" style={styles.body}>
        <Mascot variant="front" size={HEAD} outlined />
        <AppText variant="secondary" style={styles.text}>
          {text}
        </AppText>
      </View>
      <PressDim
        accessibilityRole="button"
        accessibilityLabel={t('chat.thread.safetyHide')}
        onPress={onHide}
        style={styles.hide}
        testID="chat-safety-hide"
      >
        <SymbolView name="xmark" size={HIDE_GLYPH} tintColor={PlatformColor('secondaryLabel')} />
      </PressDim>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    marginHorizontal: space.md,
    marginBottom: space.md,
    paddingVertical: space.md,
    paddingLeft: space.md,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  text: { flex: 1 },
  hide: {
    width: vars['--touch-min'],
    height: vars['--touch-min'],
    marginVertical: -space.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

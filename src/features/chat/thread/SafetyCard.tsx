import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const HEAD = 32;

export function SafetyCard() {
  const { t } = useI18n();
  const { color } = useTheme();
  const text = t('chat.thread.safety');
  return (
    <View
      accessible
      accessibilityLabel={text}
      testID="chat-safety"
      style={[styles.card, { backgroundColor: color('--color-moment-bg') }]}
    >
      <Mascot variant="front" size={HEAD} outlined />
      <AppText variant="secondary" style={styles.text}>
        {text}
      </AppText>
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
    padding: space.md,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  text: { flex: 1 },
});

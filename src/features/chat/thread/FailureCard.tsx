import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/AppText';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const ICON = 22;

export function FailureCard({ text, testID }: { text: string; testID: string }) {
  const { color } = useTheme();
  const ink = color('--color-urgent');
  return (
    <View
      accessible
      accessibilityLabel={text}
      testID={testID}
      style={[styles.card, { backgroundColor: color('--color-urgent-fill') }]}
    >
      <SymbolView name="exclamationmark.circle.fill" size={ICON} tintColor={ink} />
      <AppText variant="secondary" style={[styles.text, { color: ink }]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: vars['--touch-min'],
    marginHorizontal: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  text: { flex: 1, fontWeight: '600' },
});

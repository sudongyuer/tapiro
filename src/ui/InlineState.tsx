import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Mascot } from './Mascot';
import { PressDim } from './PressDim';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

const HEAD = 32;
const ICON = 22;

export type InlineStateAction = { label: string; onPress: () => void; testID: string };

export function InlineState({
  text,
  action,
  tone = 'plain',
  testID,
}: {
  text: string;
  action?: InlineStateAction;
  tone?: 'plain' | 'warning';
  testID: string;
}) {
  const { color } = useTheme();
  const warning = tone === 'warning';
  const ink = warning ? color('--color-warning') : PlatformColor('label');
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: warning
            ? color('--color-warning-fill')
            : PlatformColor('secondarySystemGroupedBackground'),
        },
      ]}
    >
      <View accessible accessibilityLabel={text} testID={testID} style={styles.message}>
        {warning ? (
          <View style={styles.head}>
            <SymbolView name="exclamationmark.triangle.fill" size={ICON} tintColor={ink} />
          </View>
        ) : (
          <Mascot variant="front" size={HEAD} outlined />
        )}
        <AppText variant="secondary" style={styles.text}>
          {text}
        </AppText>
      </View>
      {action ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={action.label}
          testID={action.testID}
          onPress={action.onPress}
          style={[styles.button, { borderColor: ink }]}
        >
          <AppText variant="secondary" style={[styles.buttonLabel, { color: ink }]}>
            {action.label}
          </AppText>
        </PressDim>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minHeight: vars['--touch-min'],
  },
  head: { width: HEAD, alignItems: 'center' },
  text: { flex: 1 },
  button: {
    minHeight: vars['--touch-min'],
    marginLeft: 'auto',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontWeight: '600' },
});

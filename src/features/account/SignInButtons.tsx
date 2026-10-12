import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { authService } from './authService';
import { AUTH_PROVIDERS, type AuthProvider, type SignInFailure } from './types';

export function SignInButtons() {
  const { t } = useI18n();
  const { color } = useTheme();
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [failure, setFailure] = useState<SignInFailure | null>(null);

  async function signIn(provider: AuthProvider) {
    setPending(provider);
    setFailure(null);
    const result = await authService.signIn(provider);
    setPending(null);
    if (!result.ok) setFailure(result.reason);
  }

  return (
    <View style={styles.container}>
      {AUTH_PROVIDERS.map((provider) => (
        <Pressable
          key={provider}
          accessibilityRole="button"
          accessibilityState={{ disabled: pending !== null, busy: pending === provider }}
          disabled={pending !== null}
          onPress={() => signIn(provider)}
          testID={`sign-in-${provider}`}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: color('--color-accent'), opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <AppText variant="body" style={[styles.label, { color: color('--color-on-accent') }]}>
            {t(`account.signIn.${provider}`)}
          </AppText>
        </Pressable>
      ))}
      {failure && (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="sign-in-message"
          style={styles.message}
        >
          {t(`account.signIn.error.${failure}`)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: vars['--space-3'] },
  button: {
    minHeight: vars['--touch-min'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
  },
  label: { fontWeight: '600' },
  message: { textAlign: 'center' },
});

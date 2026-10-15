import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { AppText } from '@/ui/AppText';
import { GoogleLogo } from '@/ui/GoogleLogo';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { authService } from './authService';
import { safeSignIn } from './safeSignIn';
import type { AuthProvider, SignInFailure } from './types';

const BUTTON_HEIGHT = vars['--touch-min'] + vars['--space-2'];
const LOGO_SIZE = 18;
const CORNER_RADIUS = BUTTON_HEIGHT / 2;

export function SignInButtons() {
  const { t } = useI18n();
  const { theme, color } = useTheme();
  const [guard] = useState(createInFlightGuard);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<SignInFailure | null>(null);

  function signIn(provider: AuthProvider) {
    return guard(async () => {
      setPending(true);
      setFailure(null);
      try {
        const result = await safeSignIn(authService, provider);
        if (!result.ok) setFailure(result.reason);
      } finally {
        setPending(false);
      }
    });
  }

  const appleStyle =
    theme === 'dark' ? AppleAuthenticationButtonStyle.WHITE : AppleAuthenticationButtonStyle.BLACK;

  return (
    <View style={styles.container}>
      <AppleAuthenticationButton
        key={appleStyle}
        buttonType={AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={appleStyle}
        cornerRadius={CORNER_RADIUS}
        onPress={() => signIn('apple')}
        testID="sign-in-apple"
        style={styles.apple}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending }}
        disabled={pending}
        onPress={() => signIn('google')}
        testID="sign-in-google"
        style={({ pressed }) => [
          styles.google,
          {
            backgroundColor: color('--color-google-fill'),
            borderColor: color('--color-google-stroke'),
          },
          pressed && styles.pressed,
        ]}
      >
        <GoogleLogo size={LOGO_SIZE} />
        <AppText
          variant="body"
          style={[styles.googleLabel, { color: color('--color-google-label') }]}
        >
          {t('account.signIn.google')}
        </AppText>
      </Pressable>
      {failure && (
        <AppText
          variant="secondary"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="sign-in-message"
          style={[styles.message, { color: color('--color-urgent') }]}
        >
          {t(`account.signIn.error.${failure}`)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: vars['--space-3'] },
  apple: { height: BUTTON_HEIGHT, width: '100%' },
  google: {
    minHeight: BUTTON_HEIGHT,
    borderRadius: CORNER_RADIUS,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    borderWidth: vars['--google-stroke-width'],
  },
  pressed: { opacity: vars['--opacity-pressed'] },
  googleLabel: { fontWeight: '500', flexShrink: 1 },
  message: { textAlign: 'center', fontWeight: '600' },
});

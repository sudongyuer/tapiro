import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import { useState } from 'react';
import { PlatformColor, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { authService } from './authService';
import { safeSignIn } from './safeSignIn';
import type { AuthProvider, SignInFailure } from './types';

const BUTTON_HEIGHT = vars['--touch-min'];
const CORNER_RADIUS = BUTTON_HEIGHT / 2;

export function SignInButtons() {
  const { t } = useI18n();
  const { theme } = useTheme();
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
        style={({ pressed }) => [styles.google, pressed && styles.pressed]}
      >
        <AppText variant="body" style={styles.googleLabel}>
          {t('account.signIn.google')}
        </AppText>
      </Pressable>
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
  apple: { height: BUTTON_HEIGHT, width: '100%' },
  google: {
    minHeight: BUTTON_HEIGHT,
    borderRadius: CORNER_RADIUS,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor('separator'),
  },
  pressed: { backgroundColor: PlatformColor('systemFill') },
  googleLabel: { fontWeight: '600' },
  message: { textAlign: 'center' },
});

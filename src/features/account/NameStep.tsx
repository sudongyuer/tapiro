import { useState } from 'react';
import {
  KeyboardAvoidingView,
  PlatformColor,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { AppText } from '@/ui/AppText';
import { MascotSays } from '@/ui/MascotSays';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { checkDisplayName, initialDisplayName } from './displayName';
import type { Profile } from './profileService';
import type { AccountUser } from './types';

type NameError = 'empty' | 'tooLong' | 'saveFailed';

export function NameStep({
  user,
  profile,
  onSave,
  onDone,
  onLayout,
}: {
  user: AccountUser;
  profile: Profile | null;
  onSave: (profile: Profile) => Promise<boolean>;
  onDone: () => void;
  onLayout?: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<NameError | null>(null);
  const [saving, setSaving] = useState(false);
  const [guard] = useState(createInFlightGuard);
  const value = draft ?? initialDisplayName(profile?.displayName ?? null, user.name);
  const avatarUrl = profile?.avatarUrl ?? user.avatarUrl;

  function submit() {
    return guard(async () => {
      const checked = checkDisplayName(value);
      if (!checked.ok) {
        setError(checked.reason);
        return;
      }
      setSaving(true);
      setError(null);
      const saved = await onSave({ displayName: checked.value, avatarUrl }).catch(() => false);
      setSaving(false);
      if (saved) onDone();
      else setError('saveFailed');
    });
  }

  return (
    <MomentBackground onLayout={onLayout} testID="name-step">
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <MascotSays line={t('account.name.greeting')} />
          <View style={styles.heading}>
            <AppText variant="moment-title" accessibilityRole="header">
              {t('account.name.question')}
            </AppText>
            <AppText variant="secondary" tone="secondaryLabel">
              {t('account.name.footer')}
            </AppText>
          </View>
          <View style={styles.group}>
            <View style={[styles.card, { shadowColor: color('--color-sticker-shadow') }]}>
              <TextInput
                value={value}
                onChangeText={(text) => {
                  setDraft(text);
                  if (error) setError(null);
                }}
                onSubmitEditing={submit}
                placeholder={t('account.name.placeholder')}
                placeholderTextColor={PlatformColor('placeholderText')}
                accessibilityLabel={t('account.name.label')}
                autoCorrect={false}
                textContentType="name"
                returnKeyType="done"
                clearButtonMode="while-editing"
                testID="name-input"
                style={styles.input}
              />
            </View>
            {error && (
              <AppText
                variant="meta"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                testID="name-error"
                style={[styles.error, { color: color('--color-urgent') }]}
              >
                {t(`account.name.error.${error}`)}
              </AppText>
            )}
          </View>
        </ScrollView>
        <View style={[styles.actions, { paddingBottom: bottom + vars['--space-4'] }]}>
          <PillButton
            label={t('account.name.continue')}
            onPress={submit}
            loading={saving}
            testID="name-continue"
          />
        </View>
      </KeyboardAvoidingView>
    </MomentBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingHorizontal: vars['--space-6'],
    paddingVertical: vars['--space-4'],
    gap: vars['--space-6'],
  },
  actions: { paddingHorizontal: vars['--space-6'], paddingTop: vars['--space-2'] },
  heading: { gap: vars['--space-1'] },
  group: { gap: vars['--space-2'] },
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    paddingHorizontal: vars['--space-4'],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: vars['--space-1'],
  },
  input: {
    fontSize: vars['--text-body'],
    minHeight: vars['--touch-min'] + vars['--space-2'],
    color: PlatformColor('label'),
  },
  error: { paddingHorizontal: vars['--space-4'] },
});

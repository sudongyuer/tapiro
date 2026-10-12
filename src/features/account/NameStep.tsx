import { useState } from 'react';
import { PlatformColor, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={styles.screen}
      contentContainerStyle={styles.content}
      onLayout={onLayout}
      testID="name-step"
    >
      <View style={styles.avatar}>
        <Avatar uri={avatarUrl} size={80} label={t('account.name.avatar')} />
      </View>
      <View style={styles.group}>
        <View style={styles.card}>
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
        <AppText variant="meta" tone="secondaryLabel" style={styles.footer}>
          {t('account.name.footer')}
        </AppText>
        {error && (
          <AppText
            variant="meta"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="name-error"
            style={[styles.footer, { color: color('--color-urgent') }]}
          >
            {t(`account.name.error.${error}`)}
          </AppText>
        )}
      </View>
      <PillButton
        label={t('account.name.continue')}
        onPress={submit}
        loading={saving}
        testID="name-continue"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'], gap: vars['--space-6'] },
  avatar: { alignItems: 'center', paddingTop: vars['--space-4'] },
  group: { gap: vars['--space-2'] },
  card: {
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    paddingHorizontal: vars['--space-4'],
  },
  input: {
    fontSize: vars['--text-body'],
    minHeight: vars['--touch-min'],
    color: PlatformColor('label'),
  },
  footer: { paddingHorizontal: vars['--space-4'] },
});

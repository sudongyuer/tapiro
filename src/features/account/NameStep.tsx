import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  PlatformColor,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { AppText } from '@/ui/AppText';
import { InkText } from '@/ui/InkText';
import { InlineState } from '@/ui/InlineState';
import { MascotSays } from '@/ui/MascotSays';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { FADE_IN, FADE_OUT } from '@/ui/theme/motion';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { checkDisplayName, initialDisplayName } from './displayName';
import type { Profile } from './profileService';
import type { AccountUser } from './types';

type NameError = 'empty' | 'tooLong' | 'saveFailed';

export type ProfileLoad =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; profile: Profile | null };

export function NameStep({
  user,
  load,
  onRetry,
  onSave,
  onDone,
  onLayout,
}: {
  user: AccountUser;
  load: ProfileLoad;
  onRetry: () => void;
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
  const profile = load.status === 'ready' ? load.profile : null;
  const known = load.status === 'ready';
  const value = draft ?? initialDisplayName(profile?.displayName ?? null, user.name);
  const avatarUrl = profile?.avatarUrl ?? user.avatarUrl;

  function submit() {
    return guard(async () => {
      if (!known) return;
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
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={-bottom} style={styles.fill}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <MascotSays line={t('account.name.greeting')} />
          <View style={styles.heading}>
            <InkText
              variant="moment-title"
              outline={vars['--sticker-border']}
              ink={PlatformColor('label')}
              accessibilityRole="header"
              testID="name-question"
            >
              {t('account.name.question')}
            </InkText>
            <AppText variant="secondary" tone="secondaryLabel">
              {t('account.name.footer')}
            </AppText>
          </View>
          {load.status === 'loading' ? (
            <ActivityIndicator
              accessibilityLabel={t('account.name.loading')}
              testID="name-loading"
              style={styles.loading}
            />
          ) : load.status === 'failed' ? (
            <InlineState
              tone="warning"
              text={t('account.name.loadFailed')}
              action={{ label: t('account.name.retry'), onPress: onRetry, testID: 'name-retry' }}
              testID="name-load-failed"
            />
          ) : (
            <View style={styles.group}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: color('--color-filled-row'),
                    shadowColor: color('--color-sticker-shadow'),
                  },
                ]}
              >
                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    setDraft(text);
                    if (error) setError(null);
                  }}
                  onSubmitEditing={submit}
                  placeholder={t('account.name.placeholder')}
                  placeholderTextColor={PlatformColor('placeholderText')}
                  selectionColor={color('--color-accent')}
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
                <Animated.View entering={FADE_IN} exiting={FADE_OUT}>
                  <AppText
                    variant="meta"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    testID="name-error"
                    style={[styles.error, { color: color('--color-urgent') }]}
                  >
                    {t(`account.name.error.${error}`)}
                  </AppText>
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>
        <View style={[styles.actions, { paddingBottom: bottom + vars['--space-4'] }]}>
          <PillButton
            label={t('account.name.continue')}
            onPress={submit}
            loading={saving}
            disabled={!known}
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
  loading: { minHeight: vars['--touch-min'] + vars['--space-2'] },
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
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

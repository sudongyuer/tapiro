import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { Translation, TranslationFailure } from '@/lib/translation';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const RETRY: ReadonlySet<TranslationFailure> = new Set([
  'offline',
  'providerError',
  'unreadable',
  'busy',
]);

const REASON_KEYS = {
  offline: 'chat.translate.offline',
  providerError: 'chat.translate.providerError',
  unreadable: 'chat.translate.unreadable',
  busy: 'chat.translate.busy',
  hungry: 'chat.translate.hungry',
  capped: 'chat.translate.capped',
  needsUpdate: 'chat.translate.needsUpdate',
} as const satisfies Record<TranslationFailure, string>;

export function TranslatedText({ text, testID }: { text: string; testID: string }) {
  return (
    <View style={[styles.translated, { borderTopColor: PlatformColor('separator') }]}>
      <AppText variant="secondary" testID={testID}>
        {text}
      </AppText>
    </View>
  );
}

export function TranslationStatus({
  translation,
  rowKey,
  onRetry,
  onFeed,
}: {
  translation: Exclude<Translation, { state: 'shown' }>;
  rowKey: string;
  onRetry: () => void;
  onFeed: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  if (translation.state === 'waiting') {
    const waiting = t('chat.translate.waiting');
    return (
      <View
        style={styles.status}
        accessible
        accessibilityLabel={waiting}
        testID={`chat-translating-${rowKey}`}
      >
        <ActivityIndicator size="small" />
        <AppText variant="meta" tone="secondaryLabel">
          {waiting}
        </AppText>
      </View>
    );
  }
  const { reason } = translation;
  const action = RETRY.has(reason)
    ? { label: t('chat.translate.retry'), onPress: onRetry, id: 'retry' }
    : reason === 'hungry'
      ? { label: t('chat.translate.feed'), onPress: onFeed, id: 'feed' }
      : null;
  return (
    <View style={styles.status}>
      <AppText
        variant="meta"
        tone="secondaryLabel"
        style={styles.reason}
        testID={`chat-translate-failed-${rowKey}`}
      >
        {t(REASON_KEYS[reason])}
      </AppText>
      {action ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={action.label}
          testID={`chat-translate-${action.id}-${rowKey}`}
          onPress={action.onPress}
          style={styles.action}
        >
          <AppText variant="meta" style={{ color: color('--color-accent') }}>
            {action.label}
          </AppText>
        </PressDim>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  translated: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: space.sm,
    paddingTop: space.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: space.sm,
    minHeight: vars['--touch-min'],
    paddingLeft: space.xs,
    paddingRight: space.xxxl * 2,
  },
  reason: { flexShrink: 1 },
  action: { minHeight: vars['--touch-min'], justifyContent: 'center' },
});

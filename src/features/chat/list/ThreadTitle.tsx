import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';

import { useChatThreadInfo } from '../hooks';
import type { ThreadInfo } from '../types';
import { threadTitle } from './rowView';

const CHEVRON = 11;

const titlePeer = (info: ThreadInfo) =>
  info.kind === 'bounty' ? (info.members.find((member) => !member.left) ?? null) : null;

export function ThreadTitle({
  threadId,
  onOpenProfile,
}: {
  threadId: string;
  onOpenProfile?: (personId: string) => void;
}) {
  const { t } = useI18n();
  const info = useChatThreadInfo(threadId);
  const title = info ? threadTitle(info, t) : '';
  const peer = info && onOpenProfile ? titlePeer(info) : null;
  if (!peer || !onOpenProfile) return <Stack.Screen options={{ title, headerTitle: undefined }} />;
  return (
    <Stack.Screen
      options={{
        title,
        headerTitle: () => (
          <PressDim
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={t('reputation.profile.open', { name: title })}
            testID="chat-thread-title"
            onPress={() => onOpenProfile(peer.id)}
            style={styles.title}
          >
            <AppText variant="body" numberOfLines={1} style={styles.text}>
              {title}
            </AppText>
            <SymbolView
              name="chevron.right"
              size={CHEVRON}
              weight="semibold"
              tintColor={PlatformColor('tertiaryLabel')}
            />
          </PressDim>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    minHeight: vars['--touch-min'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-1'],
    paddingHorizontal: vars['--space-2'],
  },
  text: { fontWeight: '600', flexShrink: 1 },
});

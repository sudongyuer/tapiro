import {
  ActivityIndicator,
  PlatformColor,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ChatMember } from '../types';

export function BlockedFooter({
  member,
  bottom,
  busy,
  failed,
  onUnblock,
  onLayout,
}: {
  member: ChatMember;
  bottom: number;
  busy: boolean;
  failed: boolean;
  onUnblock: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const name = member.name ?? t('chat.list.someone');
  return (
    <View style={[styles.footer, { paddingBottom: bottom + space.sm }]} onLayout={onLayout}>
      <View style={styles.line}>
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          style={styles.text}
          testID="chat-thread-blocked"
        >
          {t('chat.blocked.footer', { name })}
        </AppText>
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={t('chat.blocked.unblockA11y', { name })}
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          testID="chat-thread-unblock"
          onPress={onUnblock}
          style={styles.button}
        >
          <AppText
            variant="secondary"
            style={[styles.label, { color: color('--color-accent') }, busy && styles.hidden]}
          >
            {t('chat.blocked.unblock')}
          </AppText>
          {busy ? <ActivityIndicator style={StyleSheet.absoluteFill} /> : null}
        </PressDim>
      </View>
      {failed ? (
        <AppText
          variant="meta"
          style={[styles.failed, { color: color('--color-urgent') }]}
          testID="chat-thread-unblock-failed"
        >
          {t('chat.blocked.unblockFailed')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: PlatformColor('systemBackground'),
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  text: { flexShrink: 1, textAlign: 'center' },
  button: {
    minHeight: vars['--touch-min'],
    minWidth: vars['--touch-min'],
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600' },
  hidden: { opacity: 0 },
  failed: { textAlign: 'center' },
});

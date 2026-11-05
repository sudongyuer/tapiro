import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { chatStore } from '../services';
import type { ThreadItem } from '../types';

const SENDING_OPACITY = 0.5;
const RETRY = 44;

export const MessageBubble = memo(function MessageBubble({ item }: { item: ThreadItem }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const mine = item.kind === 'pending' || item.mine;
  const body = item.kind === 'pending' ? item.pending.body : item.message.body;
  const sending = item.kind === 'pending' && item.pending.state === 'sending';
  const failed = item.kind === 'pending' && item.pending.state === 'failed';
  const label = sending ? `${body}, ${t('chat.thread.sending')}` : body;

  return (
    <View style={[styles.row, mine ? styles.mine : styles.theirs]}>
      {failed ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={t('chat.thread.failed')}
          style={styles.retry}
          onPress={() => chatStore.retry(item.key)}
        >
          <SymbolView
            name="exclamationmark.circle.fill"
            size={RETRY / 2}
            tintColor={color('--color-urgent')}
          />
        </PressDim>
      ) : null}
      <View
        accessible
        accessibilityLabel={label}
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: color('--color-accent') }
            : { backgroundColor: PlatformColor('secondarySystemFill') },
          sending && styles.sending,
        ]}
      >
        <AppText
          variant="body"
          style={mine ? { color: color('--color-on-accent') } : undefined}
          selectable
        >
          {body}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs / 2,
  },
  mine: { justifyContent: 'flex-end', paddingLeft: space.xxxl * 2 },
  theirs: { justifyContent: 'flex-start', paddingRight: space.xxxl * 2 },
  bubble: {
    flexShrink: 1,
    borderRadius: vars['--radius-card'],
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  sending: { opacity: SENDING_OPACITY },
  retry: { width: RETRY, height: RETRY, alignItems: 'center', justifyContent: 'center' },
});

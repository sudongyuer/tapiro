import { SymbolView } from 'expo-symbols';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';
import { ContextMenuView, type ContextMenuAction } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { askReport, askResend, copyMessage } from './messageActions';
import { canRetry, sameRow, type BubbleRow } from './threadView';

const SPINNER_DELAY_MS = 500;
const STATUS = vars['--touch-min'];
const RADIUS = vars['--radius-card'];

function useLate(active: boolean) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLate(true), SPINNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setLate(false);
    };
  }, [active]);
  return active && late;
}

export const MessageBubble = memo(
  function MessageBubble({ row }: { row: BubbleRow }) {
    const { t } = useI18n();
    const { color } = useTheme();
    const { item, mine, body } = row;
    const pending = item.kind === 'pending' ? item.pending : null;
    const sending = pending?.state === 'sending';
    const late = useLate(sending);
    const spoken = row.speaker
      ? t('chat.list.from', { name: row.speaker, body })
      : t('chat.list.mine', { body });
    const label =
      pending?.state === 'failed'
        ? t('chat.thread.a11yFailed', { label: spoken })
        : pending
          ? t('chat.thread.a11ySending', { label: spoken })
          : spoken;
    const reportTarget =
      item.kind === 'stored' && row.reportable
        ? { userId: item.message.senderId, messageId: item.message.id }
        : null;
    const actions: ContextMenuAction[] = [
      { id: 'copy', title: t('chat.thread.copy'), systemImage: 'doc.on.doc' },
      ...(reportTarget
        ? [
            {
              id: 'report',
              title: t('chat.thread.report'),
              systemImage: 'exclamationmark.bubble',
              separate: true,
            },
          ]
        : []),
    ];
    const act = (id: string) => {
      if (id === 'copy') copyMessage(body);
      if (id === 'report' && reportTarget) askReport(reportTarget, t);
    };

    return (
      <View style={styles.row}>
        {row.timeBreak ? (
          <AppText variant="meta" tone="secondaryLabel" style={styles.break}>
            {row.timeBreak}
          </AppText>
        ) : null}
        {row.name ? (
          <AppText variant="meta" tone="secondaryLabel" style={styles.name}>
            {row.name}
          </AppText>
        ) : null}
        <View style={[styles.line, mine ? styles.mine : styles.theirs]}>
          {pending?.state === 'failed' ? (
            <PressDim
              accessibilityRole="button"
              accessibilityLabel={
                canRetry(pending.failure) ? t('chat.thread.failed') : t('chat.thread.undeliverable')
              }
              testID={`chat-retry-${row.key}`}
              style={styles.status}
              onPress={() => askResend(pending, t)}
            >
              <SymbolView
                name="exclamationmark.circle.fill"
                size={STATUS / 2}
                tintColor={color('--color-urgent')}
              />
            </PressDim>
          ) : null}
          {sending ? (
            <View style={styles.spinner}>
              {late ? <ActivityIndicator testID={`chat-sending-${row.key}`} /> : null}
            </View>
          ) : null}
          <ContextMenuView
            actions={actions}
            cornerRadius={RADIUS}
            onAction={act}
            style={styles.menu}
          >
            <View
              accessible
              accessibilityLabel={label}
              accessibilityActions={actions.map((action) => ({
                name: action.id,
                label: action.title,
              }))}
              onAccessibilityAction={(event) => act(event.nativeEvent.actionName)}
              testID={`chat-bubble-${row.key}`}
              style={[
                styles.bubble,
                {
                  backgroundColor: mine
                    ? color('--color-accent')
                    : PlatformColor('secondarySystemFill'),
                },
              ]}
            >
              <AppText
                variant="body"
                style={mine ? { color: color('--color-on-accent') } : undefined}
              >
                {body}
              </AppText>
            </View>
          </ContextMenuView>
        </View>
        {row.read ? (
          <AppText
            variant="meta"
            tone="secondaryLabel"
            style={styles.read}
            testID={`chat-read-${row.key}`}
          >
            {row.read}
          </AppText>
        ) : null}
      </View>
    );
  },
  (before, after) => sameRow(before.row, after.row),
);

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.md, paddingVertical: space.xs / 2 },
  line: { flexDirection: 'row', alignItems: 'center' },
  mine: { justifyContent: 'flex-end', paddingLeft: space.xxxl * 2 },
  theirs: { justifyContent: 'flex-start', paddingRight: space.xxxl * 2 },
  menu: { flexShrink: 1, borderRadius: RADIUS },
  bubble: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  status: { width: STATUS, height: STATUS, alignItems: 'center', justifyContent: 'center' },
  spinner: { width: STATUS / 2, marginRight: space.xs },
  break: { textAlign: 'center', paddingVertical: space.sm },
  name: { paddingLeft: space.md, paddingBottom: 2 },
  read: { textAlign: 'right', paddingTop: space.xs / 2, paddingRight: space.xs },
});

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { SheetActions } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { actionLocked, type ActionState } from './statusState';
import { actionKey, type StatusAction, type StatusActions } from './timeline';
import type { StatusRole } from './types';

function menuProgress(state: ActionState) {
  if (state.kind !== 'sending' && state.kind !== 'settling') return null;
  if (state.action === 'cancelPreview') return 'bounty.cancel.checking' as const;
  if (state.action === 'cancel') return 'bounty.cancel.sending' as const;
  return null;
}

export function StatusMenu({
  actions,
  role,
  state,
  onAction,
}: {
  actions: StatusAction[];
  role: StatusRole;
  state: ActionState;
  onAction: (action: StatusAction) => void;
}) {
  const { t } = useI18n();
  const locked = actionLocked(state);
  const busy = menuProgress(state);
  if (busy) {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t(busy)}
            testID="bounty-status-menu-busy"
            style={styles.busy}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon="ellipsis"
        accessibilityLabel={t('bounty.status.action.more')}
        hidden={actions.length === 0}
      >
        {actions.map((action) => (
          <Stack.Toolbar.MenuAction
            key={action}
            icon={action === 'cancel' ? 'xmark.circle' : 'clock'}
            destructive={action === 'cancel'}
            disabled={locked}
            onPress={() => onAction(action)}
          >
            {t(actionKey(action, role))}
          </Stack.Toolbar.MenuAction>
        ))}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

export type StatusMessage = { onPress: () => void; busy: boolean };

export function PinnedActions({
  actions,
  role,
  state,
  message,
  onAction,
}: {
  actions: StatusActions['pinned'];
  role: StatusRole;
  state: ActionState;
  message: StatusMessage | null;
  onAction: (action: StatusAction) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const notice = state.kind === 'failed' ? t('bounty.status.failed') : null;

  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  if (actions.length === 0 && !notice && !message) return null;
  const locked = actionLocked(state);
  const buttons = actions.map((action, index) => (
    <PillButton
      key={action}
      label={t(actionKey(action, role))}
      variant={index === 0 ? 'primary' : 'secondary'}
      loading={locked && 'action' in state && state.action === action}
      disabled={locked}
      onPress={() => onAction(action)}
      testID={`bounty-status-action-${action}`}
    />
  ));
  const chat = message ? (
    <PillButton
      label={t('bounty.status.action.message')}
      variant="secondary"
      loading={message.busy}
      onPress={message.onPress}
      testID="bounty-status-message"
    />
  ) : null;
  const [first, ...rest] = buttons;
  return (
    <SheetActions>
      {notice ? (
        <AppText
          variant="secondary"
          accessibilityRole="alert"
          testID="bounty-status-failed"
          style={[styles.notice, { color: color('--color-urgent') }]}
        >
          {notice}
        </AppText>
      ) : null}
      {chat && first ? (
        <View style={styles.row}>
          {chat}
          <View style={styles.fill}>{first}</View>
        </View>
      ) : (
        (chat ?? first)
      )}
      {rest}
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: vars['--space-2'] },
  fill: { flex: 1 },
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});

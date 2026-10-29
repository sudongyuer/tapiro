import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { SheetActions } from '@/ui/SheetFrame';
import { useTheme } from '@/ui/theme/useTheme';

import { actionLocked, type ActionState } from './statusState';
import { actionKey, type StatusAction, type StatusActions } from './timeline';
import type { StatusRole } from './types';

export function StatusMenu({
  actions,
  role,
  locked,
  onAction,
}: {
  actions: StatusAction[];
  role: StatusRole;
  locked: boolean;
  onAction: (action: StatusAction) => void;
}) {
  const { t } = useI18n();
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

export function PinnedActions({
  actions,
  role,
  state,
  onAction,
}: {
  actions: StatusActions['pinned'];
  role: StatusRole;
  state: ActionState;
  onAction: (action: StatusAction) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const notice = state.kind === 'failed' ? t('bounty.status.failed') : null;

  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  if (actions.length === 0 && !notice) return null;
  const locked = actionLocked(state);
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
      {actions.map((action, index) => (
        <PillButton
          key={action}
          label={t(actionKey(action, role))}
          variant={index === 0 ? 'primary' : 'secondary'}
          loading={locked && 'action' in state && state.action === action}
          disabled={locked}
          onPress={() => onAction(action)}
          testID={`bounty-status-action-${action}`}
        />
      ))}
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
});

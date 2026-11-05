import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { ChatMember, ThreadInfo } from '../types';
import { menuPeople } from './safetyView';

export type MenuChoice =
  { kind: 'detail' } | { kind: 'report' | 'block' | 'unblock'; member: ChatMember };

export function ThreadMenu({
  info,
  busy,
  onChoose,
}: {
  info: ThreadInfo | null;
  busy: boolean;
  onChoose: (choice: MenuChoice) => void;
}) {
  const { t } = useI18n();
  if (busy) {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t('chat.menu.busy')}
            testID="chat-thread-menu-busy"
            style={styles.busy}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );
  }
  const people = info ? menuPeople(info) : { report: [], block: [], unblock: [] };
  const name = (member: ChatMember) => member.name ?? t('chat.list.someone');
  const group = info?.kind === 'ride';
  const action = (kind: 'report' | 'block' | 'unblock', member: ChatMember) => (
    <Stack.Toolbar.MenuAction
      key={`${kind}-${member.id}`}
      icon={
        kind === 'report'
          ? 'exclamationmark.bubble'
          : kind === 'block'
            ? 'hand.raised'
            : 'hand.raised.slash'
      }
      destructive={kind === 'block'}
      onPress={() => onChoose({ kind, member })}
    >
      {group ? name(member) : t(`chat.menu.${kind}`, { name: name(member) })}
    </Stack.Toolbar.MenuAction>
  );

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel={t('chat.menu.more')} hidden={!info}>
        <Stack.Toolbar.MenuAction icon="info.circle" onPress={() => onChoose({ kind: 'detail' })}>
          {t('chat.menu.detail')}
        </Stack.Toolbar.MenuAction>
        {group ? (
          <Stack.Toolbar.Menu inline>
            <Stack.Toolbar.Menu
              title={t('chat.menu.reportMember')}
              icon="exclamationmark.bubble"
              hidden={people.report.length === 0}
            >
              {people.report.map((member) => action('report', member))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu
              title={t('chat.menu.blockMember')}
              icon="hand.raised"
              destructive
              hidden={people.block.length === 0}
            >
              {people.block.map((member) => action('block', member))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu
              title={t('chat.menu.unblockMember')}
              icon="hand.raised.slash"
              hidden={people.unblock.length === 0}
            >
              {people.unblock.map((member) => action('unblock', member))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        ) : (
          <Stack.Toolbar.Menu inline>
            {[
              ...people.report.map((member) => action('report', member)),
              ...people.block.map((member) => action('block', member)),
              ...people.unblock.map((member) => action('unblock', member)),
            ]}
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});

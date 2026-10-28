import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { BlockState } from './blockFlow';
import type { BlockedPerson } from './types';

export function BlockMenu({
  poster,
  state,
  onAsk,
}: {
  poster: BlockedPerson | null;
  state: BlockState;
  onAsk: (poster: BlockedPerson) => void;
}) {
  const { t } = useI18n();
  if (state === 'busy') {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t('bounty.block.blocking')}
            testID="bounty-detail-blocking"
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
        accessibilityLabel={t('bounty.detail.more')}
        hidden={poster === null}
      >
        <Stack.Toolbar.MenuAction
          icon="hand.raised"
          destructive
          onPress={() => {
            if (poster) onAsk(poster);
          }}
        >
          {t('bounty.block.menu', { name: poster?.name ?? t('bounty.post.unknownName') })}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});

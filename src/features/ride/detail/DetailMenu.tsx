import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import { menuItems, type MenuItem } from './detailModel';
import type { RideDetail } from './types';

const ICONS: Record<MenuItem, SFSymbol> = {
  reviseTime: 'clock.arrow.circlepath',
  editDetails: 'car',
  cancel: 'xmark.circle',
  leave: 'rectangle.portrait.and.arrow.right',
  block: 'hand.raised',
};

const DESTRUCTIVE = new Set<MenuItem>(['cancel', 'leave', 'block']);

export type RideMessage = { onPress: () => void; busy: boolean };

export function DetailMenu({
  ride,
  now,
  blocking,
  message,
  onChoose,
}: {
  ride: RideDetail | null;
  now: number;
  blocking: boolean;
  message: RideMessage | null;
  onChoose: (item: MenuItem) => void;
}) {
  const { t } = useI18n();
  if (blocking) {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t('block.blocking')}
            testID="ride-detail-blocking"
            style={styles.busy}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );
  }
  const items = ride ? menuItems(ride, now) : [];
  const name = ride?.organiser?.name ?? t('bounty.post.unknownName');
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="bubble.left.and.bubble.right"
        accessibilityLabel={t('ride.detail.chat')}
        hidden={message === null}
        disabled={message?.busy}
        onPress={message?.onPress}
      />
      <Stack.Toolbar.Menu
        icon="ellipsis"
        accessibilityLabel={t('ride.detail.more')}
        hidden={items.length === 0}
      >
        {items.map((item) => (
          <Stack.Toolbar.MenuAction
            key={item}
            icon={ICONS[item]}
            destructive={DESTRUCTIVE.has(item)}
            onPress={() => onChoose(item)}
          >
            {item === 'block' ? t('block.menu', { name }) : t(`ride.detail.menu.${item}`)}
          </Stack.Toolbar.MenuAction>
        ))}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});

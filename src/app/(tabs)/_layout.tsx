import { useRouter, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useSignedInUser } from '@/features/account';
import { useLiveBounties } from '@/features/bounty';
import { useLivePayments } from '@/features/payment';
import {
  UrgentAccessory,
  accessoryVisible,
  badgeText,
  pickMostUrgent,
  useTabLocation,
} from '@/features/shell';
import { homeSignals } from '@/lib/homeSignals';
import { useI18n } from '@/lib/i18n';
import { useLiveStickers } from '@/lib/stickers';
import { useLiveItems } from '@/lib/useLiveItems';
import { useLiveCardsOnScreen } from '@/lib/useHomeSignals';
import { useTheme } from '@/ui/theme/useTheme';

const TAPIR_BUTTON = require('@/assets/images/tapir-button.png');

export default function TabsLayout() {
  const { t } = useI18n();
  const { color } = useTheme();
  const router = useRouter();
  const userId = useSignedInUser()?.id ?? null;
  useLivePayments(userId);
  useLiveBounties(userId);
  useLiveStickers(userId);
  const location = useTabLocation(useSegments());
  const feed = useLiveItems();
  const liveCardsOnScreen = useLiveCardsOnScreen();
  const urgent = pickMostUrgent(feed.accessory);
  const badge = badgeText(feed.unreadMessages);
  const showAccessory = accessoryVisible({
    hasItem: urgent !== null,
    onHomeRoot: location.tab === 'bounty' && location.onRoot,
    liveCardsOnScreen,
  });

  const openHome = () => {
    router.navigate('/bounty');
    homeSignals.requestReveal();
  };

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={color('--color-accent')}>
      {showAccessory && urgent ? (
        <NativeTabs.BottomAccessory>
          <UrgentAccessory urgent={urgent} onPress={openHome} />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="bounty" testID="tab-bounty">
        <NativeTabs.Trigger.Label>{t('shell.tabs.bounty')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ride" testID="tab-ride">
        <NativeTabs.Trigger.Label>{t('shell.tabs.ride')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages" testID="tab-messages">
        <NativeTabs.Trigger.Label>{t('shell.tabs.messages')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <NativeTabs.Trigger.Badge hidden={badge === null}>{badge ?? ''}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me" testID="tab-me">
        <NativeTabs.Trigger.Label>{t('shell.tabs.me')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="tapir"
        role="search"
        disabled
        testID="tab-ask-tapir"
        accessibilityLabel={t('shell.tabs.askTapir')}
        listeners={{
          tabPress: () => router.push({ pathname: '/ask', params: { tab: location.tab } }),
        }}
      >
        <NativeTabs.Trigger.Label>{t('shell.tabs.askTapir')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={TAPIR_BUTTON} renderingMode="original" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

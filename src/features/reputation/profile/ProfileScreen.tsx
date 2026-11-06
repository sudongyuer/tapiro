import { Form, Host, ProgressView, Section } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  refreshable,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useBlockPerson, useUnblockPerson } from '@/features/block';
import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useProfile, useProfileGone } from '../hooks';
import { profileStore } from '../services';
import type { ProfileCard } from '../types';
import { ProfileHeader, ProfileNumbers } from './ProfileHeader';
import { LevelCard, MascotRow, StickerBookRow } from './ProfileMascot';
import { ProfileMenu, type ProfileMenuChoice } from './ProfileMenu';
import { ProfileReviewsSection } from './ProfileReviews';
import { personName } from './profileView';

export type ProfileActions = {
  onOpenReviews: () => void;
  onReport: () => void;
  onReply: (reviewId: string) => void;
  onOpenStickers: () => void;
  onBack: () => void;
};

export function ProfileScreen({ personId, ...actions }: { personId: string } & ProfileActions) {
  const { t } = useI18n();
  const { color } = useTheme();
  const card = useProfile(personId);
  const gone = useProfileGone(personId);
  const blocking = useBlockPerson('poster');
  const unblocking = useUnblockPerson();

  if (gone) {
    return (
      <View style={styles.gone}>
        <Stack.Screen options={{ title: '' }} />
        <InlineState
          text={t('reputation.profile.gone')}
          action={{
            label: t('reputation.profile.back'),
            onPress: actions.onBack,
            testID: 'profile-back',
          }}
          testID="profile-gone"
        />
      </View>
    );
  }

  const data = card.status === 'idle' ? null : card.data;
  const name = data ? personName(data.name, t) : '';
  const retry = {
    label: t('reputation.profile.retry'),
    onPress: () => void profileStore.reloadCard(personId),
    testID: 'profile-retry',
  };
  const choose = (choice: ProfileMenuChoice) => {
    if (!data) return;
    const person = { id: data.id, name: data.name };
    if (choice === 'report') actions.onReport();
    else if (choice === 'block') blocking.ask(person);
    else unblocking.ask(person);
  };

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ProfileMenu
        name={name}
        blocked={data?.blockedByMe ?? false}
        hidden={!data || data.self}
        busy={blocking.state === 'busy' || unblocking.state === 'busy'}
        onChoose={choose}
      />
      <Host style={styles.host} testID="profile-screen">
        <Form
          modifiers={[
            tint(color('--color-accent')),
            refreshable(() => profileStore.reloadCard(personId)),
          ]}
        >
          {card.status === 'stale' && data ? (
            <NoticeCard
              tone="warning"
              icon="exclamationmark.triangle.fill"
              title={t('reputation.profile.stale')}
              action={retry}
              testID="profile-stale"
            />
          ) : null}
          {blocking.state === 'failed' || unblocking.state === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t(blocking.state === 'failed' ? 'block.failed' : 'block.list.unblockFailed')}
              testID="profile-block-failed"
            />
          ) : null}
          {data ? (
            <ProfileBody card={data} actions={actions} />
          ) : card.status === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('reputation.profile.failed')}
              action={retry}
              testID="profile-failed"
            />
          ) : (
            <Section>
              <ProgressView
                modifiers={[
                  accessibilityLabel(t('reputation.profile.loading')),
                  accessibilityIdentifier('profile-loading'),
                ]}
              />
            </Section>
          )}
        </Form>
      </Host>
    </>
  );
}

function ProfileBody({ card, actions }: { card: ProfileCard; actions: ProfileActions }) {
  const reviews = (
    <ProfileReviewsSection
      card={card}
      onOpenAll={actions.onOpenReviews}
      onReply={actions.onReply}
    />
  );
  if (card.self) {
    return (
      <>
        <ProfileHeader card={card} />
        <ProfileNumbers card={card} />
        <LevelCard mascot={card.mascot} />
        <StickerBookRow count={card.mascot.stickers} onPress={actions.onOpenStickers} />
        {reviews}
      </>
    );
  }
  return (
    <>
      <ProfileHeader card={card} />
      <ProfileNumbers card={card} />
      {reviews}
      <MascotRow mascot={card.mascot} />
    </>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  gone: {
    flex: 1,
    justifyContent: 'center',
    padding: vars['--space-4'],
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
});

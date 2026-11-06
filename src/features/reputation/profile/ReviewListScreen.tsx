import { Button, Form, Host, ProgressView, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  onAppear,
  refreshable,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { useTheme } from '@/ui/theme/useTheme';

import { useProfile, useProfileReviews, useRefreshFailed } from '../hooks';
import { profileStore } from '../services';
import { FacesLine } from './ProfileReviews';
import { personName } from './profileView';
import { ReviewRow } from './ReviewRow';

export function ReviewListScreen({
  personId,
  onReply,
}: {
  personId: string;
  onReply: (reviewId: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const card = useProfile(personId);
  const list = useProfileReviews(personId);
  const refreshFailed = useRefreshFailed(personId, 'list');
  const owner = card.status === 'idle' ? null : card.data;
  const self = owner?.self ?? false;
  const rows = owner && list.status !== 'idle' ? list.data : null;
  const failed = list.status === 'failed' || (!owner && card.status === 'failed');
  const reload = () =>
    Promise.all([
      profileStore.reloadList(personId),
      owner ? Promise.resolve() : profileStore.reloadCard(personId),
    ]).then(() => undefined);
  const retry = {
    label: t('reputation.profile.retry'),
    onPress: () => void reload(),
    testID: 'profile-reviews-retry',
  };
  return (
    <>
      <Stack.Screen options={{ title: t('reputation.profile.reviews') }} />
      <Host style={styles.host} testID="profile-reviews">
        <Form modifiers={[tint(color('--color-accent')), refreshable(reload)]}>
          {list.status === 'stale' && refreshFailed && rows ? (
            <NoticeCard
              tone="warning"
              icon="exclamationmark.triangle.fill"
              title={t('reputation.profile.stale')}
              action={retry}
              testID="profile-reviews-stale"
            />
          ) : null}
          {rows ? (
            <Section>
              {owner ? <FacesLine card={owner} /> : null}
              {rows.items.map((review, index) => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  owner={personName(owner?.name ?? null, t)}
                  self={self}
                  onReply={self ? onReply : null}
                  modifiers={
                    index === rows.items.length - 1
                      ? [onAppear(() => void profileStore.loadMore(personId))]
                      : []
                  }
                />
              ))}
              {rows.more === 'loading' ? (
                <ProgressView
                  modifiers={[
                    accessibilityLabel(t('reputation.profile.loadingMore')),
                    accessibilityIdentifier('profile-reviews-more'),
                  ]}
                />
              ) : rows.more === 'failed' ? (
                <Button
                  onPress={() => void profileStore.loadMore(personId)}
                  testID="profile-reviews-more-retry"
                  modifiers={[
                    accessibilityLabel(
                      [t('reputation.profile.moreFailed'), t('reputation.profile.retry')].join(
                        t('reputation.profile.listJoin'),
                      ),
                    ),
                  ]}
                >
                  <Text>{`${t('reputation.profile.moreFailed')} · ${t('reputation.profile.retry')}`}</Text>
                </Button>
              ) : null}
            </Section>
          ) : failed ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('reputation.profile.failed')}
              action={retry}
              testID="profile-reviews-failed"
            />
          ) : (
            <Section>
              <ProgressView
                modifiers={[
                  accessibilityLabel(t('reputation.profile.loading')),
                  accessibilityIdentifier('profile-reviews-loading'),
                ]}
              />
            </Section>
          )}
        </Form>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

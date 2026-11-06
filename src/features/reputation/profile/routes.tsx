import { useLocalSearchParams, useRouter, type NativeStackNavigationOptions } from 'expo-router';

import { ProfileReportSheet } from './ProfileReportSheet';
import { ProfileScreen } from './ProfileScreen';
import { ReplySheet } from './ReplySheet';
import { ReviewListScreen } from './ReviewListScreen';

export type ProfileTab = 'bounty' | 'messages' | 'ride' | 'me';

const PATHS = {
  bounty: {
    profile: '/bounty/profile/[id]',
    reviews: '/bounty/profile/reviews/[id]',
    report: '/bounty/profile/report',
    reply: '/bounty/profile/reply',
  },
  messages: {
    profile: '/messages/profile/[id]',
    reviews: '/messages/profile/reviews/[id]',
    report: '/messages/profile/report',
    reply: '/messages/profile/reply',
  },
  ride: {
    profile: '/ride/profile/[id]',
    reviews: '/ride/profile/reviews/[id]',
    report: '/ride/profile/report',
    reply: '/ride/profile/reply',
  },
  me: {
    profile: '/me/profile/[id]',
    reviews: '/me/profile/reviews/[id]',
    report: '/me/profile/report',
    reply: '/me/profile/reply',
  },
} as const;

export const profileHref = (tab: ProfileTab, id: string) => ({
  pathname: PATHS[tab].profile,
  params: { id },
});

function useProfileLinks(tab: ProfileTab, personId: string) {
  const router = useRouter();
  return {
    router,
    reply: (review: string) =>
      router.push({ pathname: PATHS[tab].reply, params: { person: personId, review } }),
  };
}

export function ProfileRoute({ tab }: { tab: ProfileTab }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { router, reply } = useProfileLinks(tab, id ?? '');
  if (!id) return null;
  return (
    <ProfileScreen
      personId={id}
      onOpenReviews={() => router.push({ pathname: PATHS[tab].reviews, params: { id } })}
      onReport={() => router.push({ pathname: PATHS[tab].report, params: { person: id } })}
      onReply={reply}
      onOpenStickers={() =>
        tab === 'me' ? router.push('/me/stickers') : router.navigate('/me/stickers')
      }
      onBack={() => router.back()}
    />
  );
}

export function ProfileReviewsRoute({ tab }: { tab: ProfileTab }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reply } = useProfileLinks(tab, id ?? '');
  if (!id) return null;
  return <ReviewListScreen personId={id} onReply={reply} />;
}

export function ProfileReportRoute() {
  const router = useRouter();
  const { person } = useLocalSearchParams<{ person: string }>();
  if (!person) return null;
  return <ProfileReportSheet personId={person} onClose={() => router.back()} />;
}

export function ProfileReplyRoute() {
  const router = useRouter();
  const { person, review } = useLocalSearchParams<{ person: string; review: string }>();
  if (!person || !review) return null;
  return <ReplySheet personId={person} reviewId={review} onClose={() => router.back()} />;
}

export const PROFILE_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerTitle: '',
  headerLargeTitleEnabled: false,
  scrollEdgeEffects: { top: 'automatic' },
};

export const PROFILE_LIST_OPTIONS: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: false,
  scrollEdgeEffects: { top: 'automatic' },
};

export const PROFILE_SHEET_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: [0.7, 1],
  sheetGrabberVisible: true,
  headerLargeTitleEnabled: false,
};

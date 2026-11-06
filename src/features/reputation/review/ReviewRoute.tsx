import {
  Stack,
  useLocalSearchParams,
  useRouter,
  type NativeStackNavigationOptions,
} from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { useReviewState } from '../hooks';
import { reviewStore } from '../services';
import { ITEM_KINDS, targetKey, type ItemKind, type ReviewTarget } from '../types';
import { findPair } from './reviewView';
import { ReviewSheet } from './ReviewSheet';

export const reviewHref = (target: ReviewTarget, title: string | null) => ({
  pathname: '/review' as const,
  params: {
    kind: target.kind,
    item: target.itemId,
    person: target.reviewee,
    ...(title ? { title } : null),
  },
});

export const REVIEW_SHEET_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: [1],
  sheetGrabberVisible: true,
  headerShown: true,
  headerLargeTitleEnabled: false,
  scrollEdgeEffects: { top: 'automatic' },
};

function Unavailable({
  text,
  onRetry,
  onClose,
}: {
  text: string;
  onRetry: (() => void) | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.message}>
      <Stack.Screen options={{ title: t('reputation.home.action') }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onClose}>
          {t('reputation.sheet.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <InlineState
        text={text}
        testID="review-unavailable"
        action={
          onRetry
            ? { label: t('reputation.profile.retry'), onPress: onRetry, testID: 'review-retry' }
            : undefined
        }
      />
    </View>
  );
}

function ReviewLoader({
  target,
  title,
  onClose,
}: {
  target: ReviewTarget;
  title: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const item = useReviewState(target.kind, target.itemId);
  if (item.status === 'failed') {
    return (
      <Unavailable
        text={t('reputation.profile.failed')}
        onRetry={() => void reviewStore.reloadItem(target.kind, target.itemId)}
        onClose={onClose}
      />
    );
  }
  if (item.status === 'idle' || !item.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          accessible
          accessibilityLabel={t('reputation.sheet.loading')}
          testID="review-loading"
        />
      </View>
    );
  }
  const pair = findPair(item.data, target);
  if (!pair) {
    return <Unavailable text={t('reputation.sheet.notFound')} onRetry={null} onClose={onClose} />;
  }
  return (
    <ReviewSheet
      key={targetKey(target)}
      pair={pair}
      target={target}
      title={title}
      onClose={onClose}
    />
  );
}

export function ReviewRoute() {
  const router = useRouter();
  const { kind, item, person, title } = useLocalSearchParams<{
    kind: string;
    item: string;
    person: string;
    title?: string;
  }>();
  const itemKind = ITEM_KINDS.find((one): one is ItemKind => one === kind);
  const target = useMemo(
    () => (itemKind && item && person ? { kind: itemKind, itemId: item, reviewee: person } : null),
    [itemKind, item, person],
  );
  if (!target) return null;
  return <ReviewLoader target={target} title={title ?? null} onClose={() => router.back()} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, padding: vars['--space-5'], justifyContent: 'center' },
});

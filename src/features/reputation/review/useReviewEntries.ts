import { useRouter } from 'expo-router';

import { useI18n } from '@/lib/i18n';

import { useReviewReadFailed, useReviewState } from '../hooks';
import { reviewStore } from '../services';
import type { ItemKind, ReviewTarget } from '../types';
import { reviewEntry } from './entryView';
import { reviewHref } from './ReviewRoute';

export function useReviewEntries(kind: ItemKind, itemId: string, title: string) {
  const { t } = useI18n();
  const router = useRouter();
  const item = useReviewState(kind, itemId);
  const readFailed = useReviewReadFailed(kind, itemId);
  const pairs = item.status === 'idle' ? null : item.data;
  const retrying = item.status === 'loading' && readFailed;
  const now = new Date();
  return {
    entries: (pairs ?? []).map((pair, index) => reviewEntry(pair, index, now, t)),
    failed: item.status === 'failed' || retrying,
    retrying,
    stale: item.status === 'stale' && readFailed,
    retry: () => void reviewStore.reloadItem(kind, itemId),
    open: (target: ReviewTarget) => router.push(reviewHref(target, title)),
  };
}

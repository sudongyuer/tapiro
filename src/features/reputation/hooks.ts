import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { IDLE_LOAD } from '@/lib/loadable';

import { shownTierDrop, type MeState } from './meStore';
import { cardKey, listKey, type ProfilesState } from './profileStore';
import type { ReviewsState } from './reviewStore';
import { followReputation, meStore, profileStore, reviewStore } from './services';
import { pairKey, targetKey, type ItemKind, type ReviewTarget } from './types';

export function useLiveReputation(userId: string | null) {
  useEffect(() => followReputation(userId, AppState), [userId]);
}

const useReviews = <T>(select: (state: ReviewsState) => T) =>
  useSyncExternalStore(reviewStore.subscribe, () => select(reviewStore.getSnapshot()));

const useProfiles = <T>(select: (state: ProfilesState) => T) =>
  useSyncExternalStore(profileStore.subscribe, () => select(profileStore.getSnapshot()));

const useMe = <T>(select: (state: MeState) => T) =>
  useSyncExternalStore(meStore.subscribe, () => select(meStore.getSnapshot()));

export function usePendingReviews() {
  const userId = useReviews((state) => state.userId);
  useEffect(() => {
    if (userId) reviewStore.loadPending();
  }, [userId]);
  return useReviews((state) => state.pending);
}

export function useReviewState(kind: ItemKind, itemId: string) {
  const userId = useReviews((state) => state.userId);
  useFocusEffect(
    useCallback(() => {
      if (userId) return reviewStore.openItem(kind, itemId);
    }, [kind, itemId, userId]),
  );
  return useReviews((state) => state.items[pairKey(kind, itemId)] ?? IDLE_LOAD);
}

export function useReviewSubmit(target: ReviewTarget) {
  return useReviews((state) => state.submits[targetKey(target)]);
}

export function useProfile(personId: string) {
  const userId = useProfiles((state) => state.userId);
  useFocusEffect(
    useCallback(() => {
      if (userId) return profileStore.openProfile(personId);
    }, [personId, userId]),
  );
  return useProfiles((state) => state.cards[personId] ?? IDLE_LOAD);
}

export function useProfileReviews(personId: string) {
  const userId = useProfiles((state) => state.userId);
  useFocusEffect(
    useCallback(() => {
      if (userId) return profileStore.openReviews(personId);
    }, [personId, userId]),
  );
  return useProfiles((state) => state.reviews[personId] ?? IDLE_LOAD);
}

export function useProfileGone(personId: string) {
  return useProfiles((state) => state.gone[personId] === true);
}

export function useRefreshFailed(personId: string, what: 'card' | 'list') {
  const key = what === 'card' ? cardKey(personId) : listKey(personId);
  return useProfiles((state) => state.readFailed[key] === true);
}

export function useReplyState(reviewId: string) {
  return useProfiles((state) => state.replies[reviewId]);
}

export function useTierDrop() {
  const userId = useMe((state) => state.userId);
  useEffect(() => {
    if (userId) meStore.loadTierDrop();
  }, [userId]);
  return useMe(shownTierDrop);
}

export function useMyMascot() {
  const userId = useMe((state) => state.userId);
  useEffect(() => {
    if (userId) meStore.loadMascot();
  }, [userId]);
  return useMe((state) => state.mascot);
}

export function useAccessoryState() {
  return useMe((state) => state.accessory);
}

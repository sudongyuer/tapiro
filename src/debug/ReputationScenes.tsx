import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSignedInUser } from '@/features/account';
import {
  profileHref,
  reviewHref,
  useLiveReputation,
  type ItemKind,
  type ProfileTab,
} from '@/features/reputation';
import { useI18n } from '@/lib/i18n';
import { uiVerifyArgument } from '@/lib/uiVerify';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const TABS: readonly ProfileTab[] = ['bounty', 'messages', 'ride', 'me'];

export function ProfileScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    const asked = uiVerifyArgument('uiVerifyProfileTab');
    const tab = TABS.find((one) => one === asked) ?? 'bounty';
    const person = uiVerifyArgument('uiVerifyProfilePerson') ?? 'fixture-person-mei';
    router.push(profileHref(tab, person), { withAnchor: true });
    onReady();
  }, [router, onReady]);
  return null;
}

export function ReviewSheetScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const userId = useSignedInUser()?.id ?? null;
  useLiveReputation(userId);
  const opened = useRef(false);
  const open = useCallback(() => {
    const kind: ItemKind = uiVerifyArgument('uiVerifyReviewKind') === 'ride' ? 'ride' : 'bounty';
    const target = {
      kind,
      itemId: uiVerifyArgument('uiVerifyReviewItem') ?? 'fixture-bounty-settled',
      reviewee: uiVerifyArgument('uiVerifyReviewPerson') ?? 'fixture-person-lin',
    };
    router.push(reviewHref(target, uiVerifyArgument('uiVerifyReviewTitle') ?? null));
  }, [router]);
  useEffect(() => {
    if (opened.current || !userId) return;
    opened.current = true;
    open();
    onReady();
  }, [userId, open, onReady]);
  return (
    <View style={styles.scene}>
      <PillButton label={t('debug.reputation.reviewOpen')} onPress={open} testID="review-reopen" />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, justifyContent: 'center', padding: vars['--space-5'] },
});

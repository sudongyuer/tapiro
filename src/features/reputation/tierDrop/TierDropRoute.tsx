import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useTierDrop } from '../hooks';
import { profileHref } from '../profile/routes';
import { meStore } from '../services';
import { TierDropSheet } from './TierDropSheet';

export function TierDropRoute({ userId }: { userId: string | null }) {
  const router = useRouter();
  const shown = useTierDrop();
  const [drop] = useState(shown);

  useEffect(() => {
    if (!drop) return;
    return () => {
      void meStore.dismissTierDrop(drop.id);
    };
  }, [drop]);

  if (!drop) return <Redirect href="/bounty" />;

  return (
    <TierDropSheet
      drop={drop}
      onGotIt={() => router.back()}
      onProfile={
        userId
          ? () => {
              router.back();
              router.navigate(profileHref('me', userId));
            }
          : null
      }
    />
  );
}

export const TIER_DROP_SHEET_OPTIONS = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
} as const;

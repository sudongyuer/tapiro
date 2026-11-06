import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useMyMascot } from '../hooks';
import { profileHref } from '../profile/routes';
import { meStore } from '../services';
import { grownMoment } from './grownView';
import { MascotGrownScreen } from './MascotGrownScreen';

export const MASCOT_GROWN_OPTIONS = { headerTitle: '', headerLargeTitleEnabled: false } as const;

export function MascotGrownRoute({ userId }: { userId: string | null }) {
  const router = useRouter();
  const mascot = useMyMascot();
  const data = mascot.status === 'idle' ? null : mascot.data;
  const [moment] = useState(() => (data?.levelUp ? grownMoment(data) : null));

  useEffect(() => {
    if (moment) void meStore.markLevelSeen(moment.to);
  }, [moment]);

  if (!moment) return <Redirect href="/bounty" />;

  return (
    <MascotGrownScreen
      moment={moment}
      onGo={
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

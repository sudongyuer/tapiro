import { useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { askConfirm, pressAnchor, type ConfirmAnchor } from '@/ui/confirm';

import type { AskSessionState } from './askSession';
import { bellyMood, draftWaitsOnTop, isHungry, type Belly } from './belly';
import { BellyBar, BellyRowSpace } from './BellyBar';
import { liveBelly, type ConsentState } from './consentStore';
import { usePantry } from './hooks';
import { HungryCard, type HungryPurpose } from './HungryCard';
import { askSession, pantryStore } from './services';
import { useFeedMotion } from './useFeedMotion';

export function useBellySlots({
  consent,
  session,
  onTomorrow,
  onManual,
  purpose,
}: {
  consent: ConsentState;
  session: AskSessionState | null;
  onTomorrow: () => void;
  onManual: () => void;
  purpose: HungryPurpose;
}) {
  const { t } = useI18n();
  const pantry = usePantry();
  const motion = useFeedMotion();
  const belly = liveBelly(consent);
  const [held, setHeld] = useState<Belly | null>(null);

  const feed = async (write: () => Promise<boolean>) => {
    pantryStore.dismissFailure();
    setHeld(belly);
    motion.hold();
    if (await write()) {
      motion.play(() => {
        setHeld(null);
        askSession.fed();
      });
      return;
    }
    motion.release();
    setHeld(null);
  };

  const swap = async (anchor: ConfirmAnchor) => {
    if (!belly) return;
    const yes = await askConfirm(
      {
        title: t('ask.hungry.swapTitle'),
        message: t('ask.hungry.swapMessage', { count: Math.max(0, belly.coins - 1) }),
        confirm: t('ask.hungry.swapConfirm'),
        keep: t('ask.hungry.cancel'),
      },
      false,
      anchor,
    );
    if (yes) await feed(pantryStore.swapAndFeed);
  };

  const hungryNow =
    isHungry(belly) &&
    !session?.sending &&
    !draftWaitsOnTop(session?.turns ?? [], session?.failed != null);
  const toldHungry = !belly && session?.failed?.reason === 'hungry';
  const showCard = motion.flying || hungryNow || toldHungry;
  // Holding the row's height while the belly loads keeps the field and its mic from moving under the finger.
  const loadingBelly = consent.status.status === 'idle' || consent.status.status === 'loading';

  return {
    bar: belly ? (
      <BellyBar belly={belly} progress={motion.progress} />
    ) : loadingBelly ? (
      <BellyRowSpace />
    ) : null,
    notice:
      belly && bellyMood(belly) === 'low' ? (
        <AppText variant="secondary" tone="secondaryLabel" testID="ask-belly-low">
          {t('ask.belly.low')}
        </AppText>
      ) : null,
    hungry: showCard ? (
      <HungryCard
        belly={held ?? belly}
        pantry={pantry}
        motion={motion}
        purpose={purpose}
        actions={{
          onFeed: () => void feed(pantryStore.feed),
          onSwap: (event: GestureResponderEvent) => void swap(pressAnchor(event)),
          onTomorrow,
          onManual,
        }}
      />
    ) : null,
  };
}

import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';

import type { AskSessionState } from './askSession';
import { bellyMood, isHungry, type Belly } from './belly';
import { BellyBar } from './BellyBar';
import { confirmSwap } from './confirmSwap';
import { liveBelly, type ConsentState } from './consentStore';
import { usePantry } from './hooks';
import { HungryCard } from './HungryCard';
import { askSession, pantryStore } from './services';
import { useFeedMotion } from './useFeedMotion';

export function useBellySlots({
  consent,
  session,
  onTomorrow,
  onManual,
}: {
  consent: ConsentState;
  session: AskSessionState | null;
  onTomorrow: () => void;
  onManual: () => void;
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

  const swap = async () => {
    if (!belly) return;
    const yes = await confirmSwap({
      title: t('ask.hungry.swapTitle'),
      message: t('ask.hungry.swapMessage', { count: Math.max(0, belly.coins - 1) }),
      confirm: t('ask.hungry.swapConfirm'),
      cancel: t('ask.hungry.cancel'),
    });
    if (yes) await feed(pantryStore.swapAndFeed);
  };

  const hungryNow = isHungry(belly) && !session?.sending;
  const toldHungry = !belly && session?.failed?.reason === 'hungry';
  const showCard = motion.flying || hungryNow || toldHungry;

  return {
    bar: belly ? <BellyBar belly={belly} progress={motion.progress} /> : null,
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
        actions={{
          onFeed: () => void feed(pantryStore.feed),
          onSwap: () => void swap(),
          onTomorrow,
          onManual,
        }}
      />
    ) : null,
  };
}

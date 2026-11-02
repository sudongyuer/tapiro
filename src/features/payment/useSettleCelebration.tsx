import { useCallback, useState } from 'react';

import type { Money } from '@/lib/money';
import { stickerStore, type StickerKind } from '@/lib/stickers';

import { Celebration, type CelebrationData } from './celebration/Celebration';
import { paymentStore } from './services';

export type SettledMoment = {
  first: boolean;
  count: number | null;
  title: string;
  name: string;
  amount: Money;
  itemKind: StickerKind;
};

export function useSettleCelebration(userId: string, onOpenBook: () => void) {
  const [data, setData] = useState<CelebrationData | null>(null);

  const settled = useCallback(
    (moment: SettledMoment | null) => {
      const known = stickerStore.getSnapshot();
      const previous = known.status === 'ready' && known.userId === userId ? known.stickers : null;
      if (moment) setData({ ...moment, previous, note: null, category: null, art: null });
      stickerStore.reload(userId);
      void paymentStore.reload(userId);
    },
    [userId],
  );

  const element = data ? (
    <Celebration
      data={data}
      onDone={() => setData(null)}
      onOpenBook={() => {
        setData(null);
        onOpenBook();
      }}
    />
  ) : null;

  return { settled, element };
}

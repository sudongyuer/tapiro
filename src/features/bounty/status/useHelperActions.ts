import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';

import type { EtaMode, EtaRequest } from './EtaSheet';
import { defaultEta } from './etaTime';
import { statusService } from './services';
import type { ActionId } from './statusState';
import type { ActionResult, StatusDetail } from './types';

type Act = <T>(
  action: ActionId,
  call: () => Promise<ActionResult<T>>,
) => Promise<ActionResult<T> | null>;

export function useHelperActions(bountyId: string, act: Act) {
  const [request, setRequest] = useState<EtaRequest | null>(null);
  const [open, setOpen] = useState(false);

  const openEta = useCallback((mode: EtaMode, detail: StatusDetail) => {
    const now = new Date();
    const fallback = defaultEta(now);
    const current = detail.etaAt;
    const initial =
      mode === 'change' && current && new Date(current) > now ? new Date(current) : fallback;
    setRequest((last) => ({ id: (last?.id ?? 0) + 1, mode, initial, current, now }));
    setOpen(true);
  }, []);

  const closeEta = useCallback(() => setOpen(false), []);

  const confirmEta = useCallback(
    (mode: EtaMode, at: Date) => {
      setOpen(false);
      const eta = at.toISOString();
      if (mode === 'start') void act('start', () => statusService.start(bountyId, eta));
      else void act('changeEta', () => statusService.updateEta(bountyId, eta));
    },
    [act, bountyId],
  );

  const complete = useCallback(
    async (action: 'complete' | 'completeAgain') => {
      const result = await act(action, () => statusService.complete(bountyId));
      if (result?.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    },
    [act, bountyId],
  );

  return { eta: { request, open }, openEta, closeEta, confirmEta, complete };
}

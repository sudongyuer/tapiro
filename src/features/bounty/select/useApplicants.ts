import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { blockEvents } from '@/features/block/blockEvents';
import { useLiveSignal } from '@/lib/live';

import { boardService } from '../board/services';
import { useFreshness } from '../board/useFreshness';
import { createApplicantsController } from './applicantsController';
import { selectService } from './services';

export function useApplicants(bountyId: string) {
  const [controller] = useState(() =>
    createApplicantsController(bountyId, {
      service: selectService,
      detail: (id) => boardService.detail(id, null),
    }),
  );
  const snapshot = useSyncExternalStore(controller.subscribe, controller.get);
  const focused = useIsFocused();

  useEffect(() => {
    if (focused) void controller.load();
  }, [controller, focused]);

  useFreshness(controller.load);

  useLiveSignal(
    ['bounty.'],
    (signal) => {
      if (!signal || signal.id === bountyId) void controller.refetch();
    },
    focused,
  );

  useEffect(() => blockEvents.onBlocked((id) => void controller.blocked(id)), [controller]);

  return {
    ...snapshot,
    refresh: controller.load,
    retry: controller.load,
    chose: controller.chose,
    send: controller.select,
    acknowledgeRace: controller.acknowledgeRace,
  };
}

import { useState, useSyncExternalStore } from 'react';

import { useI18n } from '@/lib/i18n';

import { askSheet } from '../shared/askSheet';
import { closeSheetCopy } from '../status/actionCopy';
import { statusService } from '../status/services';
import { createCloseFlow } from './closeFlow';

export function useCloseBounty(
  bountyId: string,
  applicants: number | null,
  reload: () => Promise<void>,
) {
  const { t } = useI18n();
  const [flow] = useState(() =>
    createCloseFlow({
      detail: () => statusService.detail(bountyId),
      close: () => statusService.close(bountyId),
      reload,
    }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const close = () => flow.close((charge) => askSheet(closeSheetCopy(charge, applicants, t), true));
  return { state, close };
}

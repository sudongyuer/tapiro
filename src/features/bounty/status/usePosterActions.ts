import { useCallback, useState } from 'react';

import { useI18n } from '@/lib/i18n';

import { askSheet } from '../shared/askSheet';
import { cancelSheetCopy, confirmSheetCopy } from './actionCopy';
import { askThenSend, previewThenSend } from './actionFlow';
import { issueDrafts, statusService } from './services';
import type { ActionId } from './statusState';
import { counterpartName } from './timeline';
import type { ActionResult, StatusDetail } from './types';

export type Act = <T>(
  action: ActionId,
  call: () => Promise<ActionResult<T>>,
  options?: { reload?: boolean },
) => Promise<ActionResult<T> | null>;

export function usePosterActions(bountyId: string, act: Act, onPay: (paymentId: string) => void) {
  const { t, language } = useI18n();
  const [issueOpen, setIssueOpen] = useState(false);

  const confirm = useCallback(
    async (detail: StatusDetail) => {
      const name = counterpartName(detail, 'poster') ?? t('bounty.post.unknownName');
      const result = await askThenSend(
        () => askSheet(confirmSheetCopy(name, detail.rewardSen, { t, language }), false),
        () => act('confirm', () => statusService.confirm(bountyId)),
      );
      if (result?.ok) onPay(result.value.paymentId);
    },
    [act, bountyId, language, onPay, t],
  );

  const sendIssue = useCallback(
    async (reason: string) => {
      issueDrafts.set(bountyId, reason);
      setIssueOpen(false);
      const result = await act('reportIssue', () =>
        statusService.reportProblem(bountyId, reason.trim()),
      );
      if (result?.ok) issueDrafts.set(bountyId, '');
    },
    [act, bountyId],
  );

  const cancel = useCallback(
    (detail: StatusDetail) => {
      const role = detail.viewerRole;
      const name = counterpartName(detail, role) ?? t('bounty.post.unknownName');
      return previewThenSend(
        () => act('cancelPreview', () => statusService.cancelPreview(bountyId), { reload: false }),
        (preview) => askSheet(cancelSheetCopy(preview, role, name, { t, language }), true),
        () => act('cancel', () => statusService.cancel(bountyId)),
      );
    },
    [act, bountyId, language, t],
  );

  return {
    confirm,
    cancel,
    issue: {
      open: issueOpen,
      show: () => setIssueOpen(true),
      close: () => setIssueOpen(false),
      send: sendIssue,
    },
  };
}

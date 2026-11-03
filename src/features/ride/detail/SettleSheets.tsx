import { useCallback, useState } from 'react';

import { disputeNotes, splitDrafts } from './drafts';
import { ReceiptViewer } from './SettleCards';
import { ChangeShareSheet, DisputeSheet, type ChangeRequest } from './ShareSheets';
import { emptySplit } from './splitDraft';
import { SplitSheet, type SplitRequest } from './SplitSheet';
import type { RideDetail } from './types';
import type { SettleActions } from './useSettleActions';

type Opened = { id: number; open: boolean };

export function useSettleSheets(id: string, ride: RideDetail | null, actions: SettleActions) {
  const [split, setSplit] = useState<SplitRequest | null>(null);
  const [dispute, setDispute] = useState<Opened>({ id: 0, open: false });
  const [change, setChange] = useState<ChangeRequest | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const openSplit = useCallback(
    () =>
      setSplit((last) => ({
        id: (last?.id ?? 0) + 1,
        open: true,
        draft: splitDrafts.get(id) ?? emptySplit(),
      })),
    [id],
  );

  return {
    id,
    ride,
    actions,
    split,
    dispute,
    change,
    receipt,
    openSplit,
    async reach() {
      const phase = await actions.reach();
      if (phase === 'arrived') openSplit();
    },
    openDispute: () => setDispute((last) => ({ id: last.id + 1, open: true })),
    openChange: (member: string) =>
      setChange((last) => ({ id: (last?.id ?? 0) + 1, open: true, member })),
    openReceipt: () => setReceipt(ride?.settle?.receipt ?? null),
    closeSplit: () => setSplit((last) => last && { ...last, open: false }),
    closeDispute: () => setDispute((last) => ({ ...last, open: false })),
    closeChange: () => setChange((last) => last && { ...last, open: false }),
    closeReceipt: () => setReceipt(null),
  };
}

export function SettleSheets({
  sheets,
  viewerId,
  organiserName,
}: {
  sheets: ReturnType<typeof useSettleSheets>;
  viewerId: string;
  organiserName: string;
}) {
  const { id, ride, actions } = sheets;
  return (
    <>
      <SplitSheet
        key={`split-${sheets.split?.id ?? 0}`}
        request={sheets.split}
        ride={ride}
        viewerId={viewerId}
        onDraft={(draft) => splitDrafts.set(id, draft)}
        onSend={(draft) => {
          if (!ride) return;
          sheets.closeSplit();
          void actions.sendSplit(ride, draft);
        }}
        onClose={sheets.closeSplit}
      />
      <DisputeSheet
        key={`dispute-${sheets.dispute.id}`}
        open={sheets.dispute.open}
        name={organiserName}
        initial={disputeNotes.get(id) ?? ''}
        onDraft={(text) => disputeNotes.set(id, text)}
        onSend={(text) => {
          const note = text.trim();
          if ([...note].length > 140) return;
          sheets.closeDispute();
          void actions.dispute(note === '' ? null : note);
        }}
        onClose={sheets.closeDispute}
      />
      <ChangeShareSheet
        key={`change-${sheets.change?.id ?? 0}`}
        request={sheets.change}
        ride={ride}
        onSave={(member, minor) => {
          sheets.closeChange();
          actions.changeShare(member, minor);
        }}
        onClose={sheets.closeChange}
      />
      <ReceiptViewer
        path={sheets.receipt}
        load={actions.receiptUrl}
        onClose={sheets.closeReceipt}
      />
    </>
  );
}

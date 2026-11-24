import { useCallback, useRef, useState } from 'react';

import { deviceDecimal } from '@/lib/deviceDecimal';
import type { ReceiptReader } from '@/lib/drafts/receiptDraft';

import { disputeNotes, splitDrafts } from './drafts';
import { fillFromReading, IDLE_READ, receiptUri, type ReceiptRead } from './receiptRead';
import { ReceiptViewer } from './SettleCards';
import { ChangeShareSheet, DisputeSheet, type ChangeRequest } from './ShareSheets';
import { emptySplit, type SplitDraft } from './splitDraft';
import { SplitSheet, type SplitFill, type SplitRequest } from './SplitSheet';
import type { RideDetail } from './types';
import type { SettleActions } from './useSettleActions';

type Opened = { id: number; open: boolean };

export type RideReceipts = { reader: ReceiptReader; openConsent: () => void };

export function useSettleSheets(
  id: string,
  ride: RideDetail | null,
  actions: SettleActions,
  receipts: RideReceipts | null = null,
) {
  const [split, setSplit] = useState<SplitRequest | null>(null);
  const [read, setRead] = useState<ReceiptRead>(IDLE_READ);
  const [fill, setFill] = useState<SplitFill | null>(null);
  const afterDismiss = useRef<(() => void) | null>(null);
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

  const closeSplit = useCallback(() => setSplit((last) => last && { ...last, open: false }), []);

  async function readReceipt(tapped: SplitDraft) {
    const uri = receiptUri(tapped.receipt);
    if (!receipts || !ride || uri === null) return;
    splitDrafts.set(id, tapped);
    setRead({ status: 'reading', uri });
    const outcome = await receipts.reader.read(uri, ride.currency, () => {
      afterDismiss.current = receipts.openConsent;
      closeSplit();
    });
    const filled = fillFromReading(tapped, splitDrafts.get(id), uri, outcome, deviceDecimal());
    const draft = filled.draft;
    if (draft) {
      splitDrafts.set(id, draft);
      setFill((last) => ({ count: (last?.count ?? 0) + 1, draft }));
    }
    setRead(filled.read);
  }

  return {
    id,
    ride,
    actions,
    split,
    read,
    fill,
    readable: receipts !== null,
    readReceipt: (tapped: SplitDraft) => void readReceipt(tapped),
    splitDismissed() {
      const run = afterDismiss.current;
      afterDismiss.current = null;
      run?.();
    },
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
    closeSplit,
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
        read={sheets.read}
        readable={sheets.readable}
        fill={sheets.fill}
        onDraft={(draft) => splitDrafts.set(id, draft)}
        onRead={sheets.readReceipt}
        onDismiss={sheets.splitDismissed}
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

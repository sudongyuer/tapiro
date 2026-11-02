import { useMemo } from 'react';

import type { Money } from '@/lib/money';
import { dismissSettled } from '@/lib/stickers';

import { rideDetailService as service } from '../services';
import type { RidePhase } from '../types';
import type { RideDetailStore } from './detailState';
import { disputeNotes, splitDrafts } from './drafts';
import { splitView, toSplitInput, type SplitDraft } from './splitDraft';
import type { RideDetail, RideWrite } from './types';

export type ReceivedMoment = {
  first: boolean;
  count: number | null;
  title: string;
  name: string;
  amount: Money;
  itemKind: 'ride';
};

export type RideSettleBridge = {
  pay: (paymentId: string) => void;
  openPayment: (paymentId: string) => void;
  received: (moment: ReceivedMoment | null) => void;
  openStickerBook: () => void;
};

export function useSettleActions(
  id: string,
  store: RideDetailStore,
  bridge: RideSettleBridge,
  unknownName: string,
) {
  return useMemo(() => {
    const ride = () => {
      const load = store.get().load;
      return load.kind === 'ready' ? load.detail : null;
    };

    async function upload(draft: SplitDraft): Promise<string | null | 'failed'> {
      const { receipt } = draft;
      if (receipt.status === 'none') return null;
      if (receipt.status === 'uploaded') return receipt.path;
      try {
        const path = await service.uploadReceipt(id, receipt.uri);
        splitDrafts.set(id, { ...draft, receipt: { status: 'uploaded', uri: receipt.uri, path } });
        return path;
      } catch {
        splitDrafts.set(id, { ...draft, receipt: { status: 'failed', uri: receipt.uri } });
        return 'failed';
      }
    }

    return {
      async reach(): Promise<RidePhase | null> {
        const answer = await store.act('reach', () => service.reach(id));
        return answer?.ok ? answer.value : null;
      },
      async sendSplit(detail: RideDetail, draft: SplitDraft) {
        splitDrafts.set(id, draft);
        const answer = await store.act('split', async (): Promise<RideWrite> => {
          const path = await upload(draft);
          if (path === 'failed') return { ok: false, reason: 'failed' };
          const input = toSplitInput(splitView(detail, draft), path);
          if (!input) return { ok: false, reason: 'invalid' };
          return service.sendSplit(id, input);
        });
        if (answer?.ok) splitDrafts.clear(id);
        return answer?.ok ?? false;
      },
      async dispute(note: string | null) {
        const answer = await store.act('dispute', () => service.dispute(id, note));
        if (answer?.ok) disputeNotes.clear(id);
        return answer?.ok ?? false;
      },
      changeShare: (member: string, minor: number) =>
        void store.act('changeShare', () => service.changeShare(id, member, minor), member),
      async confirmReceived(paymentId: string) {
        const rider = ride()?.settle?.riders.find((r) => r.paymentId === paymentId) ?? null;
        const detail = ride();
        const answer = await store.act(
          'confirmReceived',
          () => service.confirmReceived(id, paymentId),
          rider?.id ?? null,
        );
        if (!answer?.ok) return;
        bridge.received(
          answer.value.rideSettled && rider && detail
            ? {
                first: answer.value.firstSettled,
                count: answer.value.stickerCount,
                title: `${detail.start.short} → ${detail.dest.short}`,
                name: rider.name ?? unknownName,
                amount: rider.share,
                itemKind: 'ride',
              }
            : null,
        );
      },
      notReceived(paymentId: string) {
        const rider = ride()?.settle?.riders.find((r) => r.paymentId === paymentId) ?? null;
        void store.act('notReceived', () => service.notReceived(id, paymentId), rider?.id ?? null);
      },
      async collect() {
        const sticker = ride()?.sticker;
        if (!sticker) return;
        const answer = await store.act('collect', () => service.collectSticker(id, sticker.id));
        if (answer?.ok) dismissSettled(sticker.id);
      },
      receiptUrl: (path: string) => service.receiptUrl(path),
      pay: bridge.pay,
      openPayment: bridge.openPayment,
      openStickerBook: bridge.openStickerBook,
    };
  }, [id, store, bridge, unknownName]);
}

export type SettleActions = ReturnType<typeof useSettleActions>;

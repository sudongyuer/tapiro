import { useMemo } from 'react';
import { ActionSheetIOS } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { rideDetailService as service } from '../services';
import type { SplitMode } from '../types';
import type { RideDetailStore } from './detailState';
import { applyNotes, detailsDrafts } from './drafts';
import type { DetailsInput, LateChoice, NoShowPreview } from './types';

function ask(options: { title: string; message: string; confirm: string; keep: string }) {
  return new Promise<boolean>((resolve) =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: options.title,
        message: options.message,
        options: [options.confirm, options.keep],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => resolve(index === 0),
    ),
  );
}

export function useDetailActions(id: string, store: RideDetailStore, organiserName: string) {
  const { t } = useI18n();
  return useMemo(() => {
    const noShowText = (preview: NoShowPreview) =>
      preview.noShow
        ? [
            t('ride.detail.noShow.counts'),
            preview.waiverAvailable ? t('ride.detail.noShow.waiver') : null,
          ]
            .filter(Boolean)
            .join('')
        : null;

    return {
      async request(note: string | null) {
        const answer = await store.act('request', () => service.request(id, note));
        if (answer?.ok) applyNotes.clear(id);
        return answer?.ok ?? false;
      },
      async withdraw() {
        const sure = await ask({
          title: t('ride.detail.applied.confirmTitle'),
          message: t('ride.detail.applied.confirmBody', { name: organiserName }),
          confirm: t('ride.detail.applied.confirm'),
          keep: t('ride.detail.applied.keep'),
        });
        if (sure) await store.act('withdraw', () => service.withdraw(id));
      },
      decide: (member: string, approve: boolean) =>
        void store.act('decide', () => service.decide(id, member, approve), member),
      async leave() {
        const preview = await store.peek('leave', () => service.leavePreview(id));
        if (!preview) return;
        const sure = await ask({
          title: t('ride.detail.leave.title'),
          message: noShowText(preview) ?? t('ride.detail.leave.body', { name: organiserName }),
          confirm: t('ride.detail.leave.confirm'),
          keep: t('ride.detail.leave.keep'),
        });
        if (sure) await store.act('leave', () => service.leave(id));
      },
      async cancel() {
        const preview = await store.peek('cancel', () => service.cancelPreview(id));
        if (!preview) return;
        const sure = await ask({
          title: t('ride.detail.cancel.title'),
          message: [
            preview.refund ? t('ride.detail.cancel.refund') : t('ride.detail.cancel.members'),
            noShowText(preview),
          ]
            .filter(Boolean)
            .join('\n'),
          confirm: t('ride.detail.cancel.confirm'),
          keep: t('ride.detail.cancel.keep'),
        });
        if (sure) await store.act('cancel', () => service.cancel(id));
      },
      arrive: () => void store.act('arrive', () => service.arrive(id)),
      undoArrive: () => void store.act('undoArrive', () => service.undoArrive(id)),
      late: (minutes: LateChoice | null) => void store.act('late', () => service.late(id, minutes)),
      reviseTime: (at: Date) =>
        void store.act('reviseTime', () => service.reviseTime(id, at.toISOString())),
      async updateDetails(input: DetailsInput) {
        const answer = await store.act('updateDetails', () => service.updateDetails(id, input));
        if (answer?.ok) detailsDrafts.clear(id);
        return answer?.ok ?? false;
      },
      setSplitMode: (mode: SplitMode) =>
        void store.act('splitMode', () => service.setSplitMode(id, mode)),
      depart: (boarded: string[]) => void store.act('depart', () => service.depart(id, boarded)),
      appeal: () => void store.act('appeal', () => service.appeal(id)),
      confirmAppeal: (member: string) =>
        void store.act('confirmAppeal', () => service.confirmAppeal(id, member), member),
    };
  }, [id, store, organiserName, t]);
}

export type DetailActions = ReturnType<typeof useDetailActions>;

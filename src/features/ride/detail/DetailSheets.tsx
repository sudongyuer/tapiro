import { useCallback, useState } from 'react';

import { departsAt } from '../rideTimes';
import { DepartSheet, type DepartRequest } from './DepartSheet';
import { applyNotes, detailsDraftFrom, detailsDrafts, toApplyNote, toDetailsInput } from './drafts';
import { ApplyNoteSheet, DetailsSheet, TimeSheet, type TimeRequest } from './EditSheets';
import type { RideDetail } from './types';
import type { DetailActions } from './useDetailActions';

type Opened = { id: number; open: boolean };

export function useDetailSheets(
  id: string,
  ride: RideDetail | null,
  now: number,
  actions: DetailActions,
) {
  const [apply, setApply] = useState<Opened>({ id: 0, open: false });
  const [details, setDetails] = useState<Opened>({ id: 0, open: false });
  const [depart, setDepart] = useState<DepartRequest | null>(null);
  const [time, setTime] = useState<TimeRequest | null>(null);

  const openApply = useCallback(() => setApply((last) => ({ id: last.id + 1, open: true })), []);
  const openDetails = useCallback(
    () => setDetails((last) => ({ id: last.id + 1, open: true })),
    [],
  );
  const openDepart = () => {
    if (ride) setDepart({ id: Date.now(), ride, now: Date.now(), open: true });
  };
  const openTime = () => {
    if (ride) {
      setTime({
        id: Date.now(),
        current: departsAt(ride),
        first: Date.parse(ride.departAt),
        now: Date.now(),
        open: true,
      });
    }
  };

  return {
    id,
    ride,
    now,
    apply,
    details,
    depart,
    time,
    openApply,
    openDetails,
    openDepart,
    openTime,
    closeApply: () => setApply((last) => ({ ...last, open: false })),
    closeDetails: () => setDetails((last) => ({ ...last, open: false })),
    closeDepart: () => setDepart((last) => last && { ...last, open: false }),
    closeTime: () => setTime((last) => last && { ...last, open: false }),
    actions,
  };
}

export function DetailSheets({
  sheets,
  viewerId,
  organiserName,
  now,
}: {
  sheets: ReturnType<typeof useDetailSheets>;
  viewerId: string;
  organiserName: string;
  now: number;
}) {
  const { id, ride, actions } = sheets;
  return (
    <>
      <ApplyNoteSheet
        key={`apply-${sheets.apply.id}`}
        open={sheets.apply.open}
        name={organiserName}
        initial={applyNotes.get(id) ?? ''}
        onDraft={(text) => applyNotes.set(id, text)}
        onSend={(text) => {
          const note = toApplyNote(text);
          if (note === undefined) return;
          sheets.closeApply();
          void actions.request(note);
        }}
        onClose={sheets.closeApply}
      />
      <DetailsSheet
        key={`details-${sheets.details.id}`}
        open={sheets.details.open}
        initial={detailsDrafts.get(id) ?? detailsDraftFrom(ride?.details ?? null)}
        now={now}
        onDraft={(draft) => detailsDrafts.set(id, draft)}
        onSave={(draft) => {
          const input = toDetailsInput(draft);
          if (!input) return;
          sheets.closeDetails();
          void actions.updateDetails(input);
        }}
        onClose={sheets.closeDetails}
      />
      <DepartSheet
        request={sheets.depart}
        viewerId={viewerId}
        onDepart={(boarded) => {
          sheets.closeDepart();
          actions.depart(boarded);
        }}
        onClose={sheets.closeDepart}
      />
      <TimeSheet
        request={sheets.time}
        onSave={(at) => {
          sheets.closeTime();
          actions.reviseTime(at);
        }}
        onClose={sheets.closeTime}
      />
    </>
  );
}

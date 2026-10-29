import { createInFlightGuard } from '@/lib/inFlightGuard';
import { createStore } from '@/lib/store';

import type { BountyDetail, Person } from '../board/types';
import { INITIAL_SELECT, selectReducer, type SelectEvent, type SelectState } from './selectState';
import { applicantPerson, type SelectOutcome, type SelectService } from './types';

export type DetailLoad =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; detail: BountyDetail; refreshFailed: boolean }
  | { kind: 'gone' };

export type ApplicantsSnapshot = { select: SelectState; detail: DetailLoad };

type Deps = {
  service: Pick<SelectService, 'applicants' | 'select'>;
  detail: (bountyId: string) => Promise<BountyDetail | 'gone'>;
  now?: () => Date;
};

const SEND_FAILED: SelectOutcome = { ok: false, reason: 'failed' };

function singleFlight(task: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;

  async function loop() {
    try {
      do {
        again = false;
        await task();
      } while (again);
    } finally {
      running = null;
    }
  }

  const join = () => {
    running ??= loop();
    return running;
  };

  return {
    join,
    after() {
      if (!running) return join();
      again = true;
      return running;
    },
  };
}

export function createApplicantsController(bountyId: string, deps: Deps) {
  const now = deps.now ?? (() => new Date());
  const store = createStore<ApplicantsSnapshot>({
    select: INITIAL_SELECT,
    detail: { kind: 'loading' },
  });
  const guard = createInFlightGuard();
  let request = 0;
  let listAnswers = 0;
  let detailAnswers = 0;

  function dispatch(event: SelectEvent) {
    const current = store.get();
    const select = selectReducer(current.select, event);
    if (select !== current.select) store.set({ ...current, select });
  }

  function setDetail(detail: DetailLoad) {
    store.set({ ...store.get(), detail });
  }

  const applicants = singleFlight(async () => {
    const current = ++request;
    dispatch({ type: 'loadStarted', request: current });
    try {
      const answer = await deps.service.applicants(bountyId);
      if (current === request) listAnswers += 1;
      dispatch(
        answer === 'gone'
          ? { type: 'gone', request: current }
          : { type: 'loaded', request: current, applicants: answer, at: now().toISOString() },
      );
    } catch {
      dispatch({ type: 'loadFailed', request: current });
    }
  });

  const detail = singleFlight(async () => {
    try {
      const answer = await deps.detail(bountyId);
      detailAnswers += 1;
      setDetail(
        answer === 'gone'
          ? { kind: 'gone' }
          : { kind: 'ready', detail: answer, refreshFailed: false },
      );
      if (answer !== 'gone' && answer.helper) {
        dispatch({ type: 'helperKnown', helperId: answer.helper.id });
      }
    } catch {
      const shown = store.get().detail;
      setDetail(shown.kind === 'ready' ? { ...shown, refreshFailed: true } : { kind: 'failed' });
    }
  });

  const load = async () => {
    await Promise.all([applicants.join(), detail.join()]);
  };

  const reload = async () => {
    await Promise.all([applicants.after(), detail.after()]);
  };

  function freshWinner(before: { list: number; detail: number }): Person | null {
    const { detail: shown, select } = store.get();
    if (detailAnswers > before.detail && shown.kind === 'ready' && !shown.refreshFailed) {
      if (shown.detail.helper) return shown.detail.helper;
    }
    if (listAnswers > before.list && select.list.kind === 'ready' && !select.list.refreshFailed) {
      const helper = select.list.applicants.find((applicant) => applicant.status === 'selected');
      if (helper) return applicantPerson(helper);
    }
    return null;
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    load,
    chose(id: string) {
      dispatch({ type: 'chose', id });
    },
    select: () =>
      guard(async () => {
        dispatch({ type: 'holdCompleted' });
        const send = store.get().select.send;
        if (send.kind !== 'sending') return;
        const outcome = await deps.service
          .select(bountyId, send.applicantId)
          .catch(() => SEND_FAILED);
        if (outcome.ok || outcome.reason === 'gone') {
          dispatch({ type: 'answered', outcome });
          if (outcome.ok) await reload();
          return;
        }
        const before = { list: listAnswers, detail: detailAnswers };
        await reload();
        const winner = freshWinner(before);
        dispatch({ type: 'answered', outcome, winner });
        if (outcome.reason !== 'taken' && winner) {
          dispatch({ type: 'helperKnown', helperId: winner.id });
        }
      }),
    acknowledgeRace() {
      dispatch({ type: 'raceAcknowledged' });
    },
    async blocked(id: string) {
      dispatch({ type: 'blocked', id, request: ++request });
      await applicants.after();
    },
  };
}

export type ApplicantsController = ReturnType<typeof createApplicantsController>;

export function selectedHelper({ select, detail }: ApplicantsSnapshot): Person | null {
  if (select.send.kind !== 'selected' || select.send.helperId === null) return null;
  const { helperId } = select.send;
  const row =
    select.list.kind === 'ready'
      ? select.list.applicants.find((applicant) => applicant.id === helperId)
      : undefined;
  if (row) return applicantPerson(row);
  return detail.kind === 'ready' && detail.detail.helper?.id === helperId
    ? detail.detail.helper
    : null;
}

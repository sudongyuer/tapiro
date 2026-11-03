import { toSignal } from './signal';
import type { ChannelEvents, ChannelStatus, LiveSignal, LiveTransport } from './types';

export type LiveStep =
  | { at: number; signal: LiveSignal }
  | { at: number; status: Extract<ChannelStatus, 'joined' | 'error'> };

const STEP_STATUS = { drop: 'error', back: 'joined' } as const;

export function parseLiveScript(script: string | undefined): LiveStep[] {
  if (!script) return [];
  return script
    .split(',')
    .flatMap((part): LiveStep[] => {
      const [atText, kind, ...rest] = part.trim().split(':');
      const at = Number(atText);
      if (!Number.isFinite(at) || at < 0 || !kind) return [];
      if (kind === 'drop' || kind === 'back') return [{ at, status: STEP_STATUS[kind] }];
      const signal = toSignal({ kind, id: rest.join(':'), at: null });
      return signal ? [{ at, signal }] : [];
    })
    .sort((a, b) => a.at - b.at);
}

export function createVerifyTransport(
  steps: readonly LiveStep[],
  timers: { set: (run: () => void, ms: number) => unknown } = {
    set: (run, ms) => setTimeout(run, ms),
  },
): LiveTransport {
  let sink: ChannelEvents | null = null;
  let started = false;
  return {
    open(_userId, events) {
      sink = events;
      timers.set(() => {
        if (sink === events) events.status('joined');
      }, 0);
      if (!started) {
        started = true;
        for (const step of steps) {
          timers.set(() => {
            if (!sink) return;
            if ('signal' in step) sink.signal(step.signal);
            else sink.status(step.status);
          }, step.at);
        }
      }
      return () => {
        if (sink === events) sink = null;
      };
    },
  };
}

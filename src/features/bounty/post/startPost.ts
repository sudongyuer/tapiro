import type { PostStatus } from './types';

type Present = (status: PostStatus) => void;

export function createHintGate() {
  let tap = 0;
  const focused = new Set<string>();
  let seenSinceTap = false;
  let pending: PostStatus | null = null;
  let present: Present = () => {};

  return {
    setPresenter(next: Present) {
      present = next;
    },
    tapped() {
      tap += 1;
      seenSinceTap = false;
      pending = null;
      return tap;
    },
    formFocused(screen: string) {
      focused.add(screen);
      if (seenSinceTap) return;
      seenSinceTap = true;
      const waiting = pending;
      pending = null;
      if (waiting) present(waiting);
    },
    formBlurred(screen: string) {
      // With a draft the tile screen mounts unfocused under the form; its blur must not drop an answer the form is
      // still waiting for, and must not mark the form as gone.
      if (!focused.delete(screen)) return;
      if (focused.size === 0) pending = null;
    },
    answered(token: number, status: PostStatus) {
      if (token !== tap || !status.blocked) return;
      if (focused.size > 0 && seenSinceTap) present(status);
      else if (!seenSinceTap) pending = status;
    },
  };
}

export type HintGate = ReturnType<typeof createHintGate>;

export function createStartPost(deps: {
  status: () => Promise<PostStatus>;
  open: () => void;
  gate: HintGate;
}) {
  return async function start() {
    const token = deps.gate.tapped();
    deps.open();
    let status: PostStatus;
    try {
      status = await deps.status();
    } catch {
      return;
    }
    deps.gate.answered(token, status);
  };
}

export type NativeText = { get(): string; set(text: string): void };

export type TextSync = {
  sync(): string;
  set(text: string): void;
  listen(report: (text: string) => void): void;
  attach(): () => void;
};

type PendingWrite = { from: string; to: string };

function read(native: NativeText): string | null {
  try {
    return native.get();
  } catch {
    return null;
  }
}

export function createTextSync(native: NativeText, start: string): TextSync {
  let last = start;
  let live = true;
  let pending: PendingWrite | null = null;
  let report = (_text: string) => {};
  return {
    sync() {
      if (!live) return last;
      const text = read(native);
      if (text === null) return last;
      if (pending) {
        if (text === pending.from && text !== pending.to) return last;
        pending = null;
      }
      if (text !== last) {
        last = text;
        report(text);
      }
      return text;
    },
    set(text) {
      const from = read(native);
      pending = from === null || from === text ? null : { from, to: text };
      last = text;
      native.set(text);
    },
    listen(next) {
      report = next;
    },
    attach() {
      live = true;
      return () => {
        live = false;
      };
    },
  };
}

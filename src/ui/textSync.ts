export type NativeText = { get(): string; set(text: string): void };

export type TextSync = {
  sync(): string;
  set(text: string): void;
  listen(report: (text: string) => void): void;
  attach(): () => void;
};

export function createTextSync(native: NativeText, start: string): TextSync {
  let last = start;
  let live = true;
  let report = (_text: string) => {};
  return {
    sync() {
      if (!live) return last;
      const text = native.get();
      if (text !== last) {
        last = text;
        report(text);
      }
      return text;
    },
    set(text) {
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

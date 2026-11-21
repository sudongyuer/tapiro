type Listener = () => void;

export function createBookFocus() {
  let shown: string | null = null;
  let jump: string | null = null;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    shown: () => shown,
    show(id: string | null) {
      shown = id;
    },
    jumpTo(id: string) {
      jump = id;
      emit();
    },
    take() {
      const id = jump;
      jump = null;
      return id;
    },
    clear() {
      shown = null;
      jump = null;
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

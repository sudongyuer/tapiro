export type NetworkReading = { isConnected?: boolean };

export type NetworkSource = {
  read(): Promise<NetworkReading>;
  listen(on: (reading: NetworkReading) => void): () => void;
};

// Only an explicit "not connected" counts as offline: an unknown state must never lock the user out.
export const isOffline = (reading: NetworkReading) => reading.isConnected === false;

export function createNetworkStore(source: NetworkSource) {
  let offline = false;
  let heard = false;
  let stop: (() => void) | null = null;
  const listeners = new Set<() => void>();

  function set(reading: NetworkReading) {
    const next = isOffline(reading);
    if (next === offline) return;
    offline = next;
    for (const listener of listeners) listener();
  }

  function start() {
    stop = source.listen((reading) => {
      heard = true;
      set(reading);
    });
    source.read().then(
      (reading) => {
        if (!heard) set(reading);
      },
      () => undefined,
    );
  }

  return {
    getSnapshot: () => offline,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!stop) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0 || !stop) return;
        stop();
        stop = null;
        heard = false;
      };
    },
  };
}

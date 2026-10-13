export function createInFlightGuard() {
  let busy = false;
  return async function run(task: () => Promise<void>) {
    if (busy) return;
    busy = true;
    try {
      await task();
    } finally {
      busy = false;
    }
  };
}

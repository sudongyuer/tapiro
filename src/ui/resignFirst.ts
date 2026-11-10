export function createResignFirst(resign: () => Promise<void>) {
  let pending = false;
  return function resignFirst<A extends unknown[]>(action: (...args: A) => void) {
    return async (...args: A) => {
      if (pending) return;
      pending = true;
      await Promise.resolve()
        .then(resign)
        .catch(() => undefined);
      pending = false;
      action(...args);
    };
  };
}

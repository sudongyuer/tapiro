import { useEffect, useState } from 'react';

export function useNowUntil(changesAt: (now: number) => number | null) {
  const [now, setNow] = useState(() => Date.now());
  const at = changesAt(now);
  useEffect(() => {
    if (at === null) return;
    // A change already due (a timer that fired early, or `now` left behind while nothing was timed) fires at once;
    // clamping to `at` keeps the next `changesAt` moving forward.
    const timer = setTimeout(() => setNow(Math.max(Date.now(), at)), Math.max(0, at - Date.now()));
    return () => clearTimeout(timer);
  }, [at]);
  return now;
}

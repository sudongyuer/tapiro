import { useEffect, useState } from 'react';

const MINUTE = 60_000;

export function useNow(step = MINUTE) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), step);
    return () => clearInterval(timer);
  }, [step]);
  return now;
}

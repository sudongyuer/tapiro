export function setTimeZone(zone: string) {
  const before = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
  process.env.TZ = zone;
  // Bun stops following TZ once the variable is deleted, so the zone is restored by name.
  return () => {
    process.env.TZ = before;
  };
}

export function inTimeZone<T>(zone: string, run: () => T): T {
  const restore = setTimeZone(zone);
  try {
    return run();
  } finally {
    restore();
  }
}

export function inTimeZone<T>(zone: string, run: () => T): T {
  const before = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
  process.env.TZ = zone;
  try {
    return run();
  } finally {
    // Bun stops following TZ once the variable is deleted, so the zone is restored by name.
    process.env.TZ = before;
  }
}

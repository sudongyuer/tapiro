export function arrivedIds(before: readonly string[] | null, after: readonly string[]) {
  if (!before) return [];
  const known = new Set(before);
  return after.filter((id) => !known.has(id));
}

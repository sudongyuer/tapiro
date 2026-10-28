export function createNoteDrafts(seed = '') {
  const notes = new Map<string, string>();
  return {
    get: (id: string) => notes.get(id) ?? seed,
    set(id: string, text: string) {
      notes.set(id, text);
    },
    clear() {
      notes.clear();
    },
  };
}

import { userCleanups } from '@/lib/userCleanups';

export function createNoteDrafts() {
  const notes = new Map<string, string>();
  return {
    get: (id: string) => notes.get(id) ?? '',
    set(id: string, text: string) {
      if (text === '') notes.delete(id);
      else notes.set(id, text);
    },
    clear() {
      notes.clear();
    },
  };
}

export const noteDrafts = createNoteDrafts();

userCleanups.register(() => noteDrafts.clear());

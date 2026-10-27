import { randomUUID } from 'expo-crypto';

export function newDraftId() {
  return randomUUID();
}

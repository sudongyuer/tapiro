import { MALAYSIA_OFFSET_MS } from '../post/cost';

export function malaysiaClock(iso: string) {
  const local = new Date(Date.parse(iso) + MALAYSIA_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

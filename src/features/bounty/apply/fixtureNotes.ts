import { NOTE_MAX } from './applyState';

const WORST_SEED =
  'Saya di lobi Sunway Geo Residences sekarang, boleh sampai dalam 10 minit. 我有推车，可以帮你把三个行李箱搬上 23 楼，到了先给你发消息。';

export const WORST_NOTE = [...WORST_SEED.repeat(2)].slice(0, NOTE_MAX).join('').trimEnd();

export function seededNote(argument: string | undefined) {
  return argument === 'worst' ? WORST_NOTE : (argument ?? '');
}

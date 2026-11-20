import { numberFormat } from './intlCache';

export function coinCount(coins: number, language: string) {
  const count = numberFormat(`${language}-MY`).format(Math.abs(coins));
  return coins < 0 ? `−${count}` : count;
}

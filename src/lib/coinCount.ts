export function coinCount(coins: number, language: string) {
  const count = new Intl.NumberFormat(`${language}-MY`).format(Math.abs(coins));
  return coins < 0 ? `−${count}` : count;
}

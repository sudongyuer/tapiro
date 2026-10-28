const HAN = /\p{Script=Han}/u;

export function nameInitial(name: string) {
  const letters = [...name.trim()];
  if (letters.length === 0) return '';
  return HAN.test(letters[0]) ? letters[letters.length - 1] : letters[0].toLocaleUpperCase();
}

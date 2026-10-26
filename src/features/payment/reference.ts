export const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE = /^TP-[A-HJ-NP-Z2-9]{4}$/;

export const isReference = (value: string) => REFERENCE.test(value);

export function newReference(taken: ReadonlySet<string>, random: () => number = Math.random) {
  for (;;) {
    let code = 'TP-';
    for (let i = 0; i < 4; i += 1)
      code += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)];
    if (!taken.has(code)) return code;
  }
}

export type SplitProblem = 'noRiders' | 'notWhole' | 'notPositive' | 'overTotal';

export function shareStep(minorDigits: number) {
  return minorDigits >= 1 ? 10 ** (minorDigits - 1) : 1;
}

export function equalSplit(totalMinor: number, people: number, minorDigits: number) {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0 || !Number.isInteger(people) || people < 1) {
    throw new RangeError('equalSplit needs a positive whole total and at least one person');
  }
  if (people === 1) return { rider: 0, organiser: totalMinor };
  const step = shareStep(minorDigits);
  const roundedUp = Math.ceil(totalMinor / (people * step)) * step;
  const rider = Math.min(roundedUp, Math.floor(totalMinor / (people - 1)));
  return { rider, organiser: totalMinor - rider * (people - 1) };
}

export function organiserShare(totalMinor: number, riders: readonly number[]) {
  return totalMinor - riders.reduce((sum, share) => sum + share, 0);
}

export function splitProblem(totalMinor: number, riders: readonly number[]): SplitProblem | null {
  if (riders.length === 0) return 'noRiders';
  if (![totalMinor, ...riders].every(Number.isInteger)) return 'notWhole';
  if (totalMinor <= 0 || riders.some((share) => share <= 0)) return 'notPositive';
  if (organiserShare(totalMinor, riders) < 0) return 'overTotal';
  return null;
}

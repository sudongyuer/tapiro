export function farePeople(seats: number, boarded: number | null) {
  return boarded ?? seats;
}

export function perPersonAbout(estimateMinor: number, people: number, minorDigits: number) {
  const unit = 10 ** minorDigits;
  return Math.max(unit, Math.round(estimateMinor / (people * unit)) * unit);
}

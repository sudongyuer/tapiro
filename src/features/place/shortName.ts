export const PLACE_KINDS = ['airport', 'mall', 'campus', 'home'] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export type ShortNameEntry = { pattern: string; shortName: string; kind: PlaceKind | null };

export const SHORT_NAME_MAX = 8;

const SEPARATORS = /\s+[-–—|·•]\s+|[,，、(（|·•]/;

const codePoints = (text: string) => Array.from(text);

export function normalisePlaceName(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/[‘’`]/g, "'").replace(/\s+/g, ' ').trim();
}

export function matchPlace(
  name: string,
  entries: readonly ShortNameEntry[],
): ShortNameEntry | null {
  const normalised = normalisePlaceName(name);
  let best: ShortNameEntry | null = null;
  for (const entry of entries) {
    if (!normalised.includes(entry.pattern)) continue;
    if (!best || entry.pattern.length > best.pattern.length) best = entry;
  }
  return best;
}

export function leadingPart(name: string) {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  const first = trimmed.split(SEPARATORS)[0].trim() || trimmed;
  if (codePoints(first).length <= SHORT_NAME_MAX) return first;
  let fitted = '';
  for (const word of first.split(' ')) {
    const next = fitted ? `${fitted} ${word}` : word;
    if (codePoints(next).length > SHORT_NAME_MAX) break;
    fitted = next;
  }
  return fitted || codePoints(first).slice(0, SHORT_NAME_MAX).join('').trim();
}

export function shortNameFor(name: string, entries: readonly ShortNameEntry[]) {
  return matchPlace(name, entries)?.shortName ?? leadingPart(name);
}

export function placeKindFor(name: string, entries: readonly ShortNameEntry[]): PlaceKind | null {
  return matchPlace(name, entries)?.kind ?? null;
}

export const isAirport = (name: string, entries: readonly ShortNameEntry[]) =>
  placeKindFor(name, entries) === 'airport';

export function validShortName(shortName: string) {
  const length = codePoints(shortName.trim()).length;
  return length >= 1 && length <= SHORT_NAME_MAX;
}

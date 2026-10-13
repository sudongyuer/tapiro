export const DISPLAY_NAME_MAX = 40;
export const PLACEHOLDER_DISPLAY_NAME = 'Tapiro';

export type DisplayNameCheck =
  { ok: true; value: string } | { ok: false; reason: 'empty' | 'tooLong' };

export function checkDisplayName(raw: string): DisplayNameCheck {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if ([...value].length > DISPLAY_NAME_MAX) return { ok: false, reason: 'tooLong' };
  return { ok: true, value };
}

export function initialDisplayName(profileName: string | null, tokenName: string | null) {
  if (profileName && profileName !== PLACEHOLDER_DISPLAY_NAME) return profileName;
  return tokenName?.trim() ?? '';
}

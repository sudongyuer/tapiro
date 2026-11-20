export type StorefrontState = { countryCode: string | null; resolved: boolean };

export const CHINA_MAINLAND = 'CHN';

export const STOREFRONT_HEADER = 'x-tapiro-storefront';

export function storefrontCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

// Closed until the first answer so a China mainland install never shows AI for a frame; an answer without a storefront
// (no App Store account) opens AI, because StoreKit then has no region to report for this install.
export function aiOffered(state: StorefrontState): boolean {
  if (state.countryCode === CHINA_MAINLAND) return false;
  return state.countryCode !== null || state.resolved;
}

export function storefrontHeader(state: StorefrontState): string {
  return state.countryCode ?? 'unknown';
}

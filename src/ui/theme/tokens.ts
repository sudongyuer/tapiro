export const vars = {
  '--color-accent': '#25232B',
  '--color-on-accent': '#FFFFFF',

  '--color-urgent': '#C4321F',
  '--color-success': '#187A50',
  '--color-warning': '#965A00',

  '--color-moment-bg': '#F4F0E6',
  '--color-moment-grain': '#3C321E21',
  '--color-sticker-border': '#FFFFFF',
  '--color-sticker-shadow': '#1E1B222E',
  '--color-mascot-ink': '#2E2B35',
  '--color-mascot-line': '#1E1C22',
  '--color-mascot-saddle': '#F3EFE6',
  '--color-mascot-blush': '#FF8A7A',
  '--color-mascot-eye': '#FFFFFF',
  '--color-mascot-snout': '#3A3742',

  '--color-card-pay': '#25232B',
  '--color-on-card-pay': '#F3EFE6',
  '--color-card-ride': '#F5C8A0',
  '--color-on-card-ride': '#25232B',
  '--color-card-progress': '#DCEBD2',
  '--color-on-card-progress': '#25232B',
  '--color-card-calm': '#F4F0E6',
  '--color-on-card-calm': '#1C1C1E',
  '--color-ride': '#F5C8A0',

  '--color-stage-urgent': '#FBE1D3',
  '--color-stage-live': '#F9E3CC',
  '--color-stage-calm': '#DCE5EE',
  '--color-on-stage': '#1C1C1E',
  '--color-stage-sun-urgent': '#FF9F7A',
  '--color-stage-sun-live': '#F6B47F',
  '--color-stage-sun-calm': '#F3EFE6',
  '--color-stage-bubble': '#FFFFFF',

  '--color-sticker-pickup': '#C89B62',
  '--color-sticker-buy': '#A8D5A2',
  '--color-sticker-queue': '#F2B8A8',
  '--color-sticker-handle': '#D9CCF2',
  '--color-sticker-move': '#B7C9D6',
  '--color-sticker-accompany': '#9BC4E2',
  '--color-sticker-study': '#F0C9DA',
  '--color-sticker-other': '#D8D4CC',
  '--color-on-sticker': '#25232B',

  '--color-object-cardboard': '#C8925A',
  '--color-object-cardboard-lid': '#DDA874',
  '--color-object-tape': '#EBD3A8',
  '--color-object-coffee': '#7A4E35',
  '--color-object-roast': '#3B2F2A',
  '--color-object-red': '#D2412C',
  '--color-object-grey': '#C7C7CC',
  '--color-object-blue': '#1D6FD1',
  '--color-object-green': '#187A50',
  '--color-object-orange': '#E8833A',
  '--color-object-violet': '#6D4AFF',
  '--color-object-coral': '#E8604C',
  '--color-object-glass': '#BFE3F5',
  '--color-object-milk-tea': '#EFD9B4',
  '--color-object-cream': '#F3EFE6',

  '--color-google-fill': '#FFFFFF',
  '--color-google-stroke': '#747775',
  '--color-google-label': '#1F1F1F',
  '--color-google-blue': '#4285F4',
  '--color-google-green': '#34A853',
  '--color-google-yellow': '#FBBC05',
  '--color-google-red': '#EA4335',
  '--google-stroke-width': 1,

  '--font-sans': 'System',
  '--font-rounded': 'ui-rounded',

  '--text-wordmark': 48,
  '--text-wordmark--line-height': 56,
  '--text-amount': 48,
  '--text-amount--line-height': 52,
  '--text-amount-compact': 36,
  '--text-amount-compact--line-height': 40,
  '--text-large-title': 34,
  '--text-large-title--line-height': 41,
  '--text-moment-title': 28,
  '--text-moment-title--line-height': 34,
  '--text-reward': 22,
  '--text-reward--line-height': 28,
  '--text-title': 20,
  '--text-title--line-height': 25,
  '--text-body': 17,
  '--text-body--line-height': 22,
  '--text-secondary': 15,
  '--text-secondary--line-height': 20,
  '--text-meta': 13,
  '--text-meta--line-height': 18,

  '--space-1': 4,
  '--space-2': 8,
  '--space-3': 12,
  '--space-4': 16,
  '--space-5': 20,
  '--space-6': 24,
  '--space-7': 32,
  '--radius-chip': 12,
  '--radius-card': 18,
  '--radius-sheet': 24,
  '--radius-pill': 999,
  '--touch-min': 44,
  '--opacity-pressed': 0.7,

  '--sticker-border': 3,
  '--sticker-border-small': 2,
  '--sticker-shadow-y': 5,
  '--sticker-shadow-blur': 6,
  '--sticker-rotation-max': 8,

  '--duration-press': 90,
  '--duration-fade': 150,
  '--duration-settle': 240,
  '--duration-peel': 420,
} as const;

export type TokenName = keyof typeof vars;

export const darkVars: Partial<Record<TokenName, string | number>> = {
  '--color-accent': '#F3EFE6',
  '--color-on-accent': '#25232B',
  '--color-urgent': '#FF6B5A',
  '--color-success': '#3ECF8E',
  '--color-warning': '#FFB340',
  '--color-moment-bg': '#24221E',
  '--color-moment-grain': '#F4F0E61A',
  '--color-sticker-border': '#FFFFFF',
  '--color-sticker-shadow': '#0000004D',
  '--color-card-pay': '#F3EFE6',
  '--color-on-card-pay': '#25232B',
  '--color-google-fill': '#131314',
  '--color-google-stroke': '#8E918F',
  '--color-google-label': '#E3E3E3',
};

export type ThemeName = 'light' | 'dark';

export function token(name: TokenName, theme: ThemeName = 'light') {
  return (theme === 'dark' ? darkVars[name] : undefined) ?? vars[name];
}

export const MUTED_TEXT_OPACITY = 0.72;

export const typeRoles = [
  'wordmark',
  'amount',
  'amount-compact',
  'large-title',
  'moment-title',
  'reward',
  'title',
  'body',
  'secondary',
  'meta',
] as const;
export type TypeRole = (typeof typeRoles)[number];

export function typeStyle(role: TypeRole) {
  return {
    fontSize: vars[`--text-${role}`],
    lineHeight: vars[`--text-${role}--line-height`],
  };
}

export const space = {
  xs: vars['--space-1'],
  sm: vars['--space-2'],
  md: vars['--space-3'],
  lg: vars['--space-4'],
  xl: vars['--space-5'],
  xxl: vars['--space-6'],
  xxxl: vars['--space-7'],
} as const;

function channel(value: number) {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return (
    0.2126 * channel((value >> 16) & 0xff) +
    0.7152 * channel((value >> 8) & 0xff) +
    0.0722 * channel(value & 0xff)
  );
}

export function contrastRatio(a: string, b: string) {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
}

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

  '--font-sans': 'System',
  '--font-rounded': 'ui-rounded',

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
};

export type ThemeName = 'light' | 'dark';

export function token(name: TokenName, theme: ThemeName = 'light') {
  return (theme === 'dark' ? darkVars[name] : undefined) ?? vars[name];
}

export const typeRoles = [
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

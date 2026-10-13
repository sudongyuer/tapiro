import { token, type ThemeName } from '@/ui/theme/tokens';

export function mascotPaint(theme: ThemeName = 'light') {
  return {
    line: token('--color-mascot-line', theme) as string,
    ink: token('--color-mascot-ink', theme) as string,
    rim: token('--color-mascot-saddle', theme) as string,
    blush: token('--color-mascot-blush', theme) as string,
    eye: token('--color-mascot-eye', theme) as string,
    snout: token('--color-mascot-snout', theme) as string,
  };
}

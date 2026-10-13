import { describe, expect, test } from 'bun:test';

import { mascotPaint } from './mascotPaint';
import { vars } from './theme/tokens';

describe('mascotPaint', () => {
  test('maps every part to its mascot token', () => {
    expect(mascotPaint('light')).toEqual({
      line: vars['--color-mascot-line'],
      ink: vars['--color-mascot-ink'],
      rim: vars['--color-mascot-saddle'],
      blush: vars['--color-mascot-blush'],
      eye: vars['--color-mascot-eye'],
      snout: vars['--color-mascot-snout'],
    });
  });

  test('the mascot looks the same in dark', () => {
    expect(mascotPaint('dark')).toEqual(mascotPaint('light'));
  });
});

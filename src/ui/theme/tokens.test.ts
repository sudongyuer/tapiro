import { describe, expect, test } from 'bun:test';

import { contrastRatio, darkVars, vars, type TokenName } from './tokens';

const LIGHT_SURFACES = ['#FFFFFF', '#F2F2F7'];
const DARK_SURFACE = '#1C1C1E';
const MIN = 4.5;

function dark(name: TokenName) {
  const value = darkVars[name];
  if (typeof value !== 'string') throw new Error(`${name} has no dark value`);
  return value;
}

describe('accent', () => {
  test('on-accent is readable on accent in both themes', () => {
    expect(contrastRatio(vars['--color-on-accent'], vars['--color-accent'])).toBeGreaterThanOrEqual(
      MIN,
    );
    expect(contrastRatio(dark('--color-on-accent'), dark('--color-accent'))).toBeGreaterThanOrEqual(
      MIN,
    );
  });

  test('accent stands out from the background in both themes', () => {
    expect(contrastRatio(vars['--color-accent'], '#FFFFFF')).toBeGreaterThanOrEqual(MIN);
    expect(contrastRatio(dark('--color-accent'), DARK_SURFACE)).toBeGreaterThanOrEqual(MIN);
  });
});

describe('status colours are text-safe', () => {
  const statuses = ['--color-urgent', '--color-success', '--color-warning'] as const;

  for (const name of statuses) {
    test(name, () => {
      for (const surface of LIGHT_SURFACES) {
        expect(contrastRatio(vars[name], surface)).toBeGreaterThanOrEqual(MIN);
      }
      expect(contrastRatio(dark(name), DARK_SURFACE)).toBeGreaterThanOrEqual(MIN);
    });
  }
});

test('moment background keeps body text readable', () => {
  expect(contrastRatio('#000000', vars['--color-moment-bg'])).toBeGreaterThanOrEqual(MIN);
  expect(contrastRatio('#FFFFFF', dark('--color-moment-bg'))).toBeGreaterThanOrEqual(MIN);
});

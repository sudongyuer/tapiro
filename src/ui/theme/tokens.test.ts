import { describe, expect, test } from 'bun:test';

import { contrastRatio, darkVars, token, vars, type ThemeName, type TokenName } from './tokens';

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

const CARDS = ['pay', 'ride', 'progress', 'calm'] as const;
const STAGES = ['urgent', 'live', 'calm'] as const;
const STICKERS = [
  'pickup',
  'buy',
  'queue',
  'handle',
  'move',
  'accompany',
  'study',
  'other',
] as const;

function resolved(name: TokenName, theme: ThemeName) {
  const value = token(name, theme);
  if (typeof value !== 'string') throw new Error(`${name} has no colour`);
  return value;
}

describe('live cards, stage and stickers keep text readable in both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const card of CARDS) {
      test(`${theme} card ${card}`, () => {
        const surface = resolved(`--color-card-${card}`, theme);
        const text = resolved(`--color-on-card-${card}`, theme);
        expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(MIN);
      });
    }
    for (const stage of STAGES) {
      test(`${theme} stage ${stage}`, () => {
        expect(
          contrastRatio(
            resolved('--color-on-stage', theme),
            resolved(`--color-stage-${stage}`, theme),
          ),
        ).toBeGreaterThanOrEqual(MIN);
      });
    }
    for (const sticker of STICKERS) {
      test(`${theme} sticker ${sticker}`, () => {
        expect(
          contrastRatio(
            resolved('--color-on-sticker', theme),
            resolved(`--color-sticker-${sticker}`, theme),
          ),
        ).toBeGreaterThanOrEqual(MIN);
      });
    }
  }

  test('ride identity colour equals the ride card', () => {
    expect(vars['--color-ride']).toBe(vars['--color-card-ride']);
  });

  test('pay card inverts in dark', () => {
    expect(dark('--color-card-pay')).toBe(vars['--color-on-card-pay']);
    expect(dark('--color-on-card-pay')).toBe(vars['--color-card-pay']);
  });
});

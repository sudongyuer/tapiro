import { describe, expect, test } from 'bun:test';

import {
  isAirport,
  leadingPart,
  placeKindFor,
  shortNameFor,
  validShortName,
  type ShortNameEntry,
} from './shortName';

const TABLE: ShortNameEntry[] = [
  { pattern: 'sunway geo', shortName: '双威', kind: 'home' },
  { pattern: 'mid valley megamall', shortName: '谷中城', kind: 'mall' },
  { pattern: 'mid valley', shortName: '谷中城', kind: 'mall' },
  { pattern: 'klia', shortName: 'KLIA', kind: 'airport' },
  { pattern: 'klia2', shortName: 'KLIA2', kind: 'airport' },
  { pattern: "taylor's university", shortName: '泰莱大学', kind: 'campus' },
  { pattern: 'cyberjaya', shortName: '赛城', kind: null },
];

describe('short name', () => {
  test('a common place takes its name from the table', () => {
    expect(shortNameFor('Mid Valley Megamall', TABLE)).toBe('谷中城');
    expect(shortNameFor('Sunway Geo Residences, Bandar Sunway', TABLE)).toBe('双威');
  });

  test('the longest matching pattern wins, so KLIA2 is not read as KLIA', () => {
    expect(shortNameFor('KLIA2 Arrival Hall', TABLE)).toBe('KLIA2');
    expect(shortNameFor('KLIA Terminal 1', TABLE)).toBe('KLIA');
  });

  test('matching ignores case, spacing, full-width letters and curly apostrophes', () => {
    expect(shortNameFor('  MID   valley  ', TABLE)).toBe('谷中城');
    expect(shortNameFor('ＫＬＩＡ２', TABLE)).toBe('KLIA2');
    expect(shortNameFor('Taylor’s University Lakeside', TABLE)).toBe('泰莱大学');
  });

  test('other places take the leading part of the name', () => {
    expect(shortNameFor('Pavilion, Bukit Bintang', TABLE)).toBe('Pavilion');
    expect(shortNameFor('IOI Mall Puchong', TABLE)).toBe('IOI Mall');
    expect(shortNameFor('双威金字塔购物中心', TABLE)).toBe('双威金字塔购物中');
    expect(shortNameFor('Universiti (UPM)', TABLE)).toBe('Universi');
  });

  test('the leading part never exceeds eight characters', () => {
    for (const name of [
      'Petaling Jaya Sentral',
      'Kelana Jaya LRT – Platform 2',
      'Supercalifragilistic',
    ]) {
      expect(Array.from(leadingPart(name)).length).toBeLessThanOrEqual(8);
      expect(leadingPart(name).length).toBeGreaterThan(0);
    }
    expect(leadingPart('Kelana Jaya LRT – Platform 2')).toBe('Kelana');
    expect(leadingPart('Supercalifragilistic')).toBe('Supercal');
  });

  test('a short name is one to eight characters after trimming', () => {
    expect(validShortName('双威')).toBe(true);
    expect(validShortName('12345678')).toBe(true);
    expect(validShortName('123456789')).toBe(false);
    expect(validShortName('   ')).toBe(false);
  });
});

describe('airport detection', () => {
  test('a destination in the table marked airport is an airport', () => {
    expect(isAirport('KLIA2', TABLE)).toBe(true);
    expect(isAirport('Kuala Lumpur International Airport (KLIA)', TABLE)).toBe(true);
    expect(placeKindFor('KLIA2', TABLE)).toBe('airport');
  });

  test('a mall, a place without a kind and an unknown place are not airports', () => {
    expect(isAirport('Mid Valley Megamall', TABLE)).toBe(false);
    expect(isAirport('Cyberjaya', TABLE)).toBe(false);
    expect(placeKindFor('Cyberjaya', TABLE)).toBeNull();
    expect(isAirport('Airport Road Hawker', TABLE)).toBe(false);
  });
});

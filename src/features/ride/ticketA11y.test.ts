import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { ticketA11y } from './ticketView';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });

const view = {
  status: '到了 · 14:00',
  tone: 'plain' as const,
  icon: 'clock' as const,
  time: null,
  route: '双威 → KLIA2',
  labels: null,
  flight: null,
  bags: null,
  amount: 'RM 13',
  fare: '',
  muted: false,
  placeholder: false,
};

describe('ticket label', () => {
  test('a ticket without a time or place labels joins no empty segment', () => {
    const label = ticketA11y(view, i18n.t, 2, 4);
    expect(label.startsWith('到了 · 14:00，双威 → KLIA2, ')).toBe(true);
    expect(label).not.toMatch(/[，,]\s*[，,]/);
  });

  test('every segment that is present is read in order', () => {
    const label = ticketA11y(
      { ...view, time: '明天 10:30', labels: 'Sunway Geo → KLIA2' },
      i18n.t,
      2,
      4,
    );
    expect(label.startsWith('到了 · 14:00，明天 10:30，双威 → KLIA2，Sunway Geo → KLIA2')).toBe(
      true,
    );
  });
});

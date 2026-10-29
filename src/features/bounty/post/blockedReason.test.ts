import { describe, expect, test } from 'bun:test';

import { blockedReason } from './blockedReason';

const NOW = new Date('2026-10-27T09:00:00.000Z');
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe('blocked reason', () => {
  test('nothing unpaid gives no reason', () => {
    expect(blockedReason([], NOW, '对方')).toBeNull();
  });

  test('two or more unpaid name the count and the total, oldest first as given', () => {
    const reason = blockedReason(
      [
        {
          paymentId: 'a',
          payeeName: '阿杰',
          amount: { minor: 1500, currency: 'MYR' },
          createdAt: ago(3),
        },
        {
          paymentId: 'b',
          payeeName: 'Lily',
          amount: { minor: 600, currency: 'MYR' },
          createdAt: ago(1),
        },
      ],
      NOW,
      '对方',
    );
    expect(reason?.kind).toBe('many');
    if (reason?.kind !== 'many') return;
    expect(reason).toMatchObject({ totals: [{ minor: 2100, currency: 'MYR' }] });
    expect(reason.unpaid.map((payment) => payment.payeeName)).toEqual(['阿杰', 'Lily']);
  });

  test('one old payment names its whole days unpaid', () => {
    const reason = blockedReason(
      [
        {
          paymentId: 'a',
          payeeName: '阿杰',
          amount: { minor: 1500, currency: 'MYR' },
          createdAt: ago(8.5),
        },
      ],
      NOW,
      '对方',
    );
    expect(reason).toMatchObject({ kind: 'old', days: 8, payment: { payeeName: '阿杰' } });
  });

  test('a payee without a name is named with the fallback', () => {
    const reason = blockedReason(
      [
        {
          paymentId: 'a',
          payeeName: '  ',
          amount: { minor: 1500, currency: 'MYR' },
          createdAt: ago(8),
        },
      ],
      NOW,
      '对方',
    );
    expect(reason).toMatchObject({ kind: 'old', payment: { payeeName: '对方' } });
  });
});

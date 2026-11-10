import { describe, expect, test } from 'bun:test';

import { forwardTransaction, type VerifyAnswer } from './forward';

const transaction = { transactionId: '42', jws: 'header.payload.signature' };

async function run(answer: VerifyAnswer) {
  const finished: string[] = [];
  const outcome = await forwardTransaction(
    transaction,
    async () => answer,
    async (id) => {
      finished.push(id);
      return true;
    },
  );
  return { outcome, finished };
}

describe('forwardTransaction', () => {
  for (const status of ['credited', 'duplicate', 'revoked'] as const) {
    test(`finishes on 200 ${status}`, async () => {
      const { outcome, finished } = await run({ ok: true, status, balance: 5 });
      expect(outcome.kind).toBe('finished');
      expect(finished).toEqual(['42']);
    });
  }

  for (const [httpStatus, error] of [
    [422, 'unverified'],
    [422, 'unknown_product'],
    [403, 'wrong_account'],
    [503, 'verification_unavailable'],
    [500, 'store_failed'],
    [null, 'network'],
  ] as const) {
    test(`keeps the transaction unfinished on ${httpStatus ?? 'no answer'} ${error}`, async () => {
      const { outcome, finished } = await run({ ok: false, httpStatus, error });
      expect(outcome.kind).toBe('kept');
      expect(finished).toEqual([]);
    });
  }
});

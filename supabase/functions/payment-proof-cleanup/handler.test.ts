import { describe, expect, mock, test } from 'bun:test';

import { handleProofCleanup, type ExpiredProof, type ProofCleanupDeps } from './handler';

const post = (token?: string) =>
  new Request('http://localhost/payment-proof-cleanup', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const EXPIRED: ExpiredProof[] = [
  { paymentId: 'p1', proofPath: 'p1/proof.jpg' },
  { paymentId: 'p2', proofPath: 'p2/proof.png' },
];

function deps(overrides: Partial<ProofCleanupDeps> = {}) {
  const cleared: string[] = [];
  return {
    cleared,
    authorized: (token: string) => token === 'service',
    expiredProofs: mock(async () => EXPIRED),
    removeObjects: mock(async (_paths: string[]) => {}),
    clearProof: async (paymentId: string) => {
      cleared.push(paymentId);
    },
    ...overrides,
  };
}

describe('handleProofCleanup', () => {
  test('removes proofs 30 days after settlement and clears their paths', async () => {
    const d = deps();
    const res = await handleProofCleanup(post('service'), d);
    expect(await res.json()).toEqual({ removed: 2 });
    expect(d.removeObjects).toHaveBeenCalledWith(['p1/proof.jpg', 'p2/proof.png']);
    expect(d.cleared).toEqual(['p1', 'p2']);
  });

  test('keeps the paths when storage removal fails', async () => {
    const d = deps({ removeObjects: mock(async () => Promise.reject(new Error('down'))) });
    expect((await handleProofCleanup(post('service'), d)).status).toBe(500);
    expect(d.cleared).toEqual([]);
  });

  test('rejects callers without the service key', async () => {
    const d = deps();
    expect((await handleProofCleanup(post('user'), d)).status).toBe(401);
    expect(d.expiredProofs).not.toHaveBeenCalled();
  });
});

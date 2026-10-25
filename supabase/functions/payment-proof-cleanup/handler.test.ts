import { describe, expect, mock, test } from 'bun:test';

import { handleProofCleanup, type ProofCleanupDeps, type ProofObject } from './handler';

const post = (token?: string) =>
  new Request('http://localhost/payment-proof-cleanup', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const DOOMED: ProofObject[] = [
  { objectName: 'p1/proof.jpg', paymentId: 'p1', clearsProof: true },
  { objectName: 'p2/draft.png', paymentId: 'p2', clearsProof: false },
  { objectName: 'gone/x.jpg', paymentId: null, clearsProof: false },
];

function deps(overrides: Partial<ProofCleanupDeps> = {}) {
  const cleared: string[] = [];
  return {
    cleared,
    authorized: (token: string) => token === 'service',
    objectsToDelete: mock(async () => DOOMED),
    removeObjects: mock(async (_names: string[]) => {}),
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
    expect(await res.json()).toEqual({ removed: 3 });
    expect(d.removeObjects).toHaveBeenCalledWith(['p1/proof.jpg', 'p2/draft.png', 'gone/x.jpg']);
    expect(d.cleared).toEqual(['p1']);
  });

  test('keeps the paths when storage removal fails', async () => {
    const d = deps({ removeObjects: mock(async () => Promise.reject(new Error('down'))) });
    expect((await handleProofCleanup(post('service'), d)).status).toBe(500);
    expect(d.cleared).toEqual([]);
  });

  test('rejects callers without the service key', async () => {
    const d = deps();
    expect((await handleProofCleanup(post('user'), d)).status).toBe(401);
    expect(d.objectsToDelete).not.toHaveBeenCalled();
  });
});

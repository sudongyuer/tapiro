import { describe, expect, mock, test } from 'bun:test';

import { handleProofCleanup, type ProofBucket, type ProofObject } from './handler';

const post = (token?: string) =>
  new Request('http://localhost/payment-proof-cleanup', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const PROOFS: ProofObject[] = [
  { objectName: 'p1/proof.jpg', ownerId: 'p1', clearsProof: true },
  { objectName: 'p2/draft.png', ownerId: 'p2', clearsProof: false },
  { objectName: 'gone/x.jpg', ownerId: null, clearsProof: false },
];

const RECEIPTS: ProofObject[] = [
  { objectName: 'r1/grab.jpg', ownerId: 'r1', clearsProof: true },
  { objectName: 'r2/old.jpg', ownerId: 'r2', clearsProof: false },
];

function bucket(objects: ProofObject[], overrides: Partial<ProofBucket> = {}) {
  const cleared: string[] = [];
  return {
    cleared,
    objectsToDelete: mock(async () => objects),
    removeObjects: mock(async (_names: string[]) => {}),
    clearProof: async (ownerId: string) => {
      cleared.push(ownerId);
    },
    ...overrides,
  };
}

const deps = (buckets: ProofBucket[]) => ({
  authorized: (token: string) => token === 'service',
  buckets,
});

describe('handleProofCleanup', () => {
  test('removes proofs 30 days after settlement and clears their paths', async () => {
    const proofs = bucket(PROOFS);
    const res = await handleProofCleanup(post('service'), deps([proofs]));
    expect(await res.json()).toEqual({ removed: 3 });
    expect(proofs.removeObjects).toHaveBeenCalledWith([
      'p1/proof.jpg',
      'p2/draft.png',
      'gone/x.jpg',
    ]);
    expect(proofs.cleared).toEqual(['p1']);
  });

  test('removes ride receipts with the payment proofs and clears the ride receipt row', async () => {
    const proofs = bucket(PROOFS);
    const receipts = bucket(RECEIPTS);
    const res = await handleProofCleanup(post('service'), deps([proofs, receipts]));
    expect(await res.json()).toEqual({ removed: 5 });
    expect(receipts.removeObjects).toHaveBeenCalledWith(['r1/grab.jpg', 'r2/old.jpg']);
    expect(receipts.cleared).toEqual(['r1']);
  });

  test('keeps the paths when storage removal fails, and still sweeps the other bucket', async () => {
    const proofs = bucket(PROOFS, {
      removeObjects: mock(async () => Promise.reject(new Error('down'))),
    });
    const receipts = bucket(RECEIPTS);
    const res = await handleProofCleanup(post('service'), deps([proofs, receipts]));
    expect(res.status).toBe(500);
    expect(proofs.cleared).toEqual([]);
    expect(receipts.cleared).toEqual(['r1']);
  });

  test('rejects callers without the service key', async () => {
    const proofs = bucket(PROOFS);
    expect((await handleProofCleanup(post('user'), deps([proofs]))).status).toBe(401);
    expect(proofs.objectsToDelete).not.toHaveBeenCalled();
  });
});

export type ExpiredProof = { paymentId: string; proofPath: string };

export type ProofCleanupDeps = {
  authorized(token: string): boolean;
  expiredProofs(): Promise<ExpiredProof[]>;
  removeObjects(paths: string[]): Promise<void>;
  clearProof(paymentId: string): Promise<void>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handleProofCleanup(req: Request, deps: ProofCleanupDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !deps.authorized(token)) return json(401, { error: 'unauthorized' });

  const expired = await deps.expiredProofs();
  if (expired.length === 0) return json(200, { removed: 0 });
  try {
    await deps.removeObjects(expired.map((proof) => proof.proofPath));
  } catch {
    return json(500, { error: 'remove_failed' });
  }
  for (const proof of expired) await deps.clearProof(proof.paymentId);
  return json(200, { removed: expired.length });
}

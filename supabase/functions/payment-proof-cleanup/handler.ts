export type ProofObject = { objectName: string; paymentId: string | null; clearsProof: boolean };

export type ProofCleanupDeps = {
  authorized(token: string): boolean;
  objectsToDelete(): Promise<ProofObject[]>;
  removeObjects(names: string[]): Promise<void>;
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

  const doomed = await deps.objectsToDelete();
  if (doomed.length === 0) return json(200, { removed: 0 });
  try {
    await deps.removeObjects(doomed.map((object) => object.objectName));
  } catch {
    return json(500, { error: 'remove_failed' });
  }
  for (const object of doomed)
    if (object.clearsProof && object.paymentId) await deps.clearProof(object.paymentId);
  return json(200, { removed: doomed.length });
}

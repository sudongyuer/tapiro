export type ProofObject = { objectName: string; ownerId: string | null; clearsProof: boolean };

export type ProofBucket = {
  objectsToDelete(): Promise<ProofObject[]>;
  removeObjects(names: string[]): Promise<void>;
  clearProof(ownerId: string): Promise<void>;
};

export type ProofCleanupDeps = {
  authorized(token: string): boolean;
  buckets: ProofBucket[];
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function sweep(bucket: ProofBucket) {
  const doomed = await bucket.objectsToDelete();
  if (doomed.length === 0) return 0;
  await bucket.removeObjects(doomed.map((object) => object.objectName));
  for (const object of doomed)
    if (object.clearsProof && object.ownerId) await bucket.clearProof(object.ownerId);
  return doomed.length;
}

export async function handleProofCleanup(req: Request, deps: ProofCleanupDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !deps.authorized(token)) return json(401, { error: 'unauthorized' });

  let removed = 0;
  let failed = false;
  for (const bucket of deps.buckets) {
    try {
      removed += await sweep(bucket);
    } catch {
      failed = true;
    }
  }
  return failed ? json(500, { error: 'remove_failed', removed }) : json(200, { removed });
}

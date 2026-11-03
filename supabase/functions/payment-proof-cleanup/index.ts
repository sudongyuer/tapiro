import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleProofCleanup, type ProofBucket } from './handler.ts';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function bucket(options: {
  bucket: string;
  list: string;
  owner: string;
  clears: string;
  clear: (ownerId: string) => PromiseLike<{ error: unknown }>;
}): ProofBucket {
  return {
    async objectsToDelete() {
      const { data, error } = await admin.rpc(options.list);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        objectName: row.object_name as string,
        ownerId: (row[options.owner] as string | null) ?? null,
        clearsProof: row[options.clears] === true,
      }));
    },
    async removeObjects(names) {
      const { error } = await admin.storage.from(options.bucket).remove(names);
      if (error) throw error;
    },
    async clearProof(ownerId) {
      const { error } = await options.clear(ownerId);
      if (error) throw error;
    },
  };
}

Deno.serve((req) =>
  handleProofCleanup(req, {
    authorized: (token) => token === serviceKey,
    buckets: [
      bucket({
        bucket: 'payment-proofs',
        list: 'payment_proofs_to_delete',
        owner: 'payment_id',
        clears: 'clears_proof',
        clear: (payment) => admin.rpc('clear_payment_proof', { payment }),
      }),
      bucket({
        bucket: 'ride-receipts',
        list: 'ride_receipts_to_delete',
        owner: 'ride_id',
        clears: 'clears_receipt',
        clear: (ride) => admin.rpc('clear_ride_receipt', { ride }),
      }),
    ],
  }),
);

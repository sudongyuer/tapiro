import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleProofCleanup } from './handler.ts';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve((req) =>
  handleProofCleanup(req, {
    authorized: (token) => token === serviceKey,
    async objectsToDelete() {
      const { data, error } = await admin.rpc('payment_proofs_to_delete');
      if (error) throw error;
      return (data ?? []).map(
        (row: { object_name: string; payment_id: string | null; clears_proof: boolean }) => ({
          objectName: row.object_name,
          paymentId: row.payment_id,
          clearsProof: row.clears_proof,
        }),
      );
    },
    async removeObjects(names) {
      const { error } = await admin.storage.from('payment-proofs').remove(names);
      if (error) throw error;
    },
    async clearProof(paymentId) {
      const { error } = await admin.rpc('clear_payment_proof', { payment: paymentId });
      if (error) throw error;
    },
  }),
);

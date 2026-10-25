import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleProofCleanup } from './handler.ts';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve((req) =>
  handleProofCleanup(req, {
    authorized: (token) => token === serviceKey,
    async expiredProofs() {
      const { data, error } = await admin.rpc('expired_payment_proofs');
      if (error) throw error;
      return (data ?? []).map((row: { payment_id: string; proof_path: string }) => ({
        paymentId: row.payment_id,
        proofPath: row.proof_path,
      }));
    },
    async removeObjects(paths) {
      const { error } = await admin.storage.from('payment-proofs').remove(paths);
      if (error) throw error;
    },
    async clearProof(paymentId) {
      const { error } = await admin.rpc('clear_payment_proof', { payment: paymentId });
      if (error) throw error;
    },
  }),
);

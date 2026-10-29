import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

import { createSupabaseStickerService } from '@/lib/stickers/service';

import { createSupabasePaymentService } from './paymentService';
import { NoRateError } from './types';

const env = Bun.spawnSync(['supabase', 'status', '-o', 'env']).stdout.toString();
const value = (key: string) => {
  const found = env.match(new RegExp(`^${key}="([^"]+)"`, 'm'))?.[1];
  if (!found) throw new Error('Local Supabase is not running');
  return found;
};

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

async function signedIn(name: string) {
  const email = `${name}-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const client = createClient(value('API_URL'), value('ANON_KEY'), {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, client, service: createSupabasePaymentService(client) };
}

async function open(payer: string, payee: string, amount: number, currency = 'MYR') {
  const { data, error } = await admin.rpc('open_payment', {
    kind: 'bounty',
    item: crypto.randomUUID(),
    item_title: '帮取快递',
    payer,
    payee,
    amount,
    currency,
  });
  if (error) throw error;
  return data as string;
}

describe('supabase payment service (local stack)', () => {
  let poster: Awaited<ReturnType<typeof signedIn>>;
  let helper: Awaited<ReturnType<typeof signedIn>>;
  let methodId: string;

  beforeAll(async () => {
    poster = await signedIn('Poster');
    helper = await signedIn('Helper');
    const inserted = await helper.client
      .from('payee_methods')
      .insert({ type: 'duitnow_id', phone: '+60123456789', display_name: 'HELPER' })
      .select('id')
      .single();
    if (inserted.error) throw inserted.error;
    methodId = inserted.data.id;
  });

  afterAll(async () => {
    for (const user of [poster, helper]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test('pays, undoes, pays with a proof and settles through the RPCs', async () => {
    const id = await open(poster.id, helper.id, 1500);
    const [listed] = await poster.service.list(poster.id);
    expect(listed).toMatchObject({
      id,
      role: 'payer',
      counterpartName: 'Helper',
      state: 'due',
      amount: { minor: 1500, currency: 'MYR' },
      paid: null,
    });
    expect(listed.reference).toMatch(/^TP-[A-HJ-NP-Z2-9]{4}$/);

    const methods = await poster.service.methodsOf(helper.id);
    expect(methods.map((method) => method.id)).toEqual([methodId]);

    const file = `data:image/png;base64,${Buffer.from('proof').toString('base64')}`;
    await expect(poster.service.markPaid(id, methodId, `${id}/missing.png`)).rejects.toBeDefined();
    const first = await poster.service.uploadProof(id, file);
    await poster.service.markPaid(id, methodId, first);
    await poster.service.undo(id);
    expect((await poster.service.get(poster.id, id))?.state).toBe('due');
    await poster.service.removeProof(first);
    const remaining = await admin.storage.from('payment-proofs').list(id);
    expect(remaining.data?.map((object) => object.name)).toEqual([]);

    const path = await poster.service.uploadProof(id, file);
    expect(path.startsWith(`${id}/`)).toBe(true);
    await poster.service.markPaid(id, methodId, path);

    const seen = await helper.service.get(helper.id, id);
    expect(seen).toMatchObject({
      role: 'payee',
      state: 'marked_paid',
      proofPath: path,
      counterpartName: 'Poster',
      paid: { minor: 1500, currency: 'MYR' },
    });
    const proof = await helper.client.storage.from('payment-proofs').download(path);
    expect(proof.error).toBeNull();
    expect(await helper.service.proofUrl(path)).toContain('/payment-proofs/');

    await helper.service.notReceived(id);
    expect((await poster.service.get(poster.id, id))?.nudgedAt).not.toBeNull();
    expect(await helper.service.confirm(id)).toEqual({ firstSettled: true, stickerCount: 1 });
    const stickers = await createSupabaseStickerService(helper.client).list(helper.id);
    expect(
      stickers.map(({ paymentId, itemKind, title }) => ({ paymentId, itemKind, title })),
    ).toEqual([{ paymentId: id, itemKind: 'bounty', title: '帮取快递' }]);
    expect(await createSupabaseStickerService(poster.client).list(helper.id)).toEqual([]);
    expect(await poster.service.list(poster.id)).toEqual([]);
    expect(await poster.service.methodsOf(helper.id)).toEqual([]);
  });

  test('a rejected transition throws instead of reporting success', async () => {
    const id = await open(poster.id, helper.id, 800);
    await expect(helper.service.confirm(id)).rejects.toBeDefined();
    await expect(poster.service.undo(id)).rejects.toBeDefined();
    expect((await poster.service.get(poster.id, id))?.state).toBe('due');
  });

  test('marking a yuan payment paid by DuitNow without a locked rate fails as no rate', async () => {
    const week = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10);
    const cleared = await admin.from('fx_rates').delete().gte('rate_date', week);
    expect(cleared.error).toBeNull();
    const id = await open(poster.id, helper.id, 1000, 'CNY');
    const marking = poster.service.markPaid(id, methodId, null);
    await expect(marking).rejects.toBeInstanceOf(NoRateError);
    expect((await poster.service.get(poster.id, id))?.state).toBe('due');
  });

  test('a yuan payment locks the BNM rate at open and prices each method', async () => {
    const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    const { error } = await admin.from('fx_rates').upsert({
      base: 'CNY',
      quote: 'MYR',
      rate_date: today,
      source: 'bnm',
      session: '1700',
      quote_per_base: 0.6494,
    });
    expect(error).toBeNull();
    const id = await open(poster.id, helper.id, 5000, 'CNY');
    const detail = await poster.service.detail(id);
    expect(detail.rate).toMatchObject({ base: 'CNY', quote: 'MYR', quotePerBase: 0.6494 });
    expect(detail.methods).toEqual([
      {
        methodId,
        type: 'duitnow_id',
        currency: 'MYR',
        amount: { minor: 3247, currency: 'MYR' },
      },
    ]);
    await poster.service.markPaid(id, methodId, null);
    expect((await helper.service.get(helper.id, id))?.paid).toEqual({
      minor: 3247,
      currency: 'MYR',
    });
  });
});

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

import { createSupabasePayeeService } from './payeeService';
import { FIXTURE_QR } from './qrFixtures';

const env = Bun.spawnSync(['supabase', 'status', '-o', 'env']).stdout.toString();
const value = (key: string) => {
  const found = env.match(new RegExp(`^${key}="([^"]+)"`, 'm'))?.[1];
  if (!found) throw new Error('Local Supabase is not running');
  return found;
};

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

async function signedInService(label: string) {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(value('API_URL'), value('ANON_KEY'), {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, service: createSupabasePayeeService(client) };
}

describe('supabase payee service (local stack)', () => {
  let owner: Awaited<ReturnType<typeof signedInService>>;
  let other: Awaited<ReturnType<typeof signedInService>>;

  beforeAll(async () => {
    owner = await signedInService('payee-owner');
    other = await signedInService('payee-other');
  });

  afterAll(async () => {
    for (const user of [owner, other]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test('round-trips every method type with the first one as default', async () => {
    const { service } = owner;
    await service.add({ type: 'duitnow_id', phone: '+60123456789', displayName: 'LIM WEI JIE' });
    await service.add({
      type: 'bank_account',
      bankCode: '588734',
      bankName: null,
      accountNumber: '1234564821',
      displayName: 'LIM WEI JIE',
    });
    await service.add({ type: 'duitnow_qr', ...FIXTURE_QR.tngDetails });
    await service.add({
      type: 'alipay',
      payload: 'https://qr.alipay.com/fkx12345abcdefghijkl',
      displayName: 'LIM WEI JIE',
    });
    await service.add({ type: 'cash' });
    const methods = await service.list();
    expect(methods.map((method) => method.type)).toEqual([
      'duitnow_id',
      'bank_account',
      'duitnow_qr',
      'alipay',
      'cash',
    ]);
    expect(methods.filter((method) => method.isDefault).map((method) => method.type)).toEqual([
      'duitnow_id',
    ]);
    expect(methods[2]).toMatchObject(FIXTURE_QR.tngDetails);
  });

  test('changes the default, updates a QR and promotes on delete', async () => {
    const { service } = owner;
    const [phone, bank, qr] = await service.list();
    await service.setDefault(bank.id);
    await service.update(qr.id, { type: 'duitnow_qr', ...FIXTURE_QR.tngDetails });
    let methods = await service.list();
    expect(methods.find((method) => method.isDefault)?.id).toBe(bank.id);
    expect(Date.parse(methods.find((m) => m.id === qr.id)!.checkedAt)).toBeGreaterThan(
      Date.parse(qr.checkedAt),
    );
    await service.remove(bank.id);
    methods = await service.list();
    expect(methods.find((method) => method.isDefault)?.id).toBe(phone.id);
  });

  test('saves a bank that is not in the picker by name', async () => {
    await owner.service.add({
      type: 'bank_account',
      bankCode: null,
      bankName: 'Bank Rakyat',
      accountNumber: '9876543210',
      displayName: 'LIM WEI JIE',
    });
    const saved = (await owner.service.list()).find(
      (method) => method.type === 'bank_account' && method.bankName === 'Bank Rakyat',
    );
    expect(saved).toMatchObject({ bankCode: null, accountNumber: '9876543210' });
  });

  test('replaces a QR with another wallet in place and keeps the default', async () => {
    const { service } = owner;
    await service.add({ type: 'duitnow_qr', ...FIXTURE_QR.tngDetails });
    const qr = (await service.list()).find((method) => method.type === 'duitnow_qr')!;
    await service.setDefault(qr.id);
    await expect(
      service.update(qr.id, {
        type: 'wechat',
        payload: 'wxp://f2f0abcdEFGH',
        displayName: 'LIM WEI JIE',
      }),
    ).rejects.toBeDefined();
    await service.replaceQr(qr.id, {
      type: 'wechat',
      payload: 'wxp://f2f0abcdEFGH',
      displayName: 'LIM WEI JIE',
    });
    const methods = await service.list();
    expect(methods.some((method) => method.id === qr.id)).toBe(false);
    expect(methods.find((method) => method.isDefault)?.type).toBe('wechat');
  });

  test('another user sees none of them and cannot change them', async () => {
    const [phone] = await owner.service.list();
    expect(await other.service.list()).toEqual([]);
    await expect(other.service.setDefault(phone.id)).rejects.toBeDefined();
    await expect(other.service.remove(phone.id)).rejects.toBeDefined();
    await expect(
      other.service.update(phone.id, {
        type: 'duitnow_id',
        phone: '+60123456789',
        displayName: 'MALLORY',
      }),
    ).rejects.toBeDefined();
    expect((await owner.service.list()).some((method) => method.id === phone.id)).toBe(true);
  });
});

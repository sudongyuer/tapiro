import { describe, expect, test } from 'bun:test';

import { createFixturePayeeService } from './fixturePayeeService';
import type { PayeeService } from './payeeService';
import { createPayeeStore } from './payeeStore';
import { FIXTURE_QR } from './qrFixtures';

const USER = 'user-1';

function flaky(service: PayeeService) {
  let failing = true;
  const fail = async () => {
    if (failing) throw new Error('offline');
  };
  return {
    service: {
      ...service,
      list: async () => (await fail(), service.list()),
      remove: async (id: string) => (await fail(), service.remove(id)),
    } satisfies PayeeService,
    recover: () => {
      failing = false;
    },
  };
}

describe('payee store', () => {
  test('a failed load becomes ready on retry', async () => {
    const { service, recover } = flaky(createFixturePayeeService('demo'));
    const store = createPayeeStore(service);
    await store.ensureLoaded(USER);
    expect(store.getSnapshot().status).toBe('failed');
    recover();
    await store.ensureLoaded(USER);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready' });
  });

  test('an empty list is ready, not loading', async () => {
    const store = createPayeeStore(createFixturePayeeService('empty'));
    await store.ensureLoaded(USER);
    expect(store.getSnapshot()).toEqual({ status: 'ready', userId: USER, methods: [] });
  });

  test('a failed delete reports false and republishes the unchanged list', async () => {
    const base = createFixturePayeeService('demo');
    const store = createPayeeStore({
      ...base,
      remove: async () => {
        throw new Error('offline');
      },
    });
    await store.ensureLoaded(USER);
    const published = store.getSnapshot();
    expect(await store.remove(USER, 'missing')).toBe(false);
    expect(store.getSnapshot()).not.toBe(published);
    expect(store.getSnapshot()).toEqual(published);
  });
});

describe('fixture service keeps the database shape rules', () => {
  test('changing a method’s type in place is refused', async () => {
    const service = createFixturePayeeService('demo');
    const qr = (await service.list()).find((method) => method.type === 'duitnow_qr')!;
    await expect(
      service.update(qr.id, {
        type: 'alipay',
        payload: 'https://qr.alipay.com/fkx1',
        displayName: 'LIM WEI JIE',
      }),
    ).rejects.toThrow('payee_methods_shape');
  });

  test('replacing a QR with another wallet keeps the default and the position', async () => {
    const service = createFixturePayeeService('demo');
    const store = createPayeeStore(service);
    await store.ensureLoaded(USER);
    const qr = (await service.list()).find((method) => method.type === 'duitnow_qr')!;
    await store.setDefault(USER, qr.id);
    expect(
      await store.replaceQr(USER, qr.id, {
        type: 'alipay',
        payload: 'https://qr.alipay.com/fkx1',
        displayName: 'LIM WEI JIE',
      }),
    ).toBe(true);
    const methods = await service.list();
    const replaced = methods.find((method) => method.type === 'alipay')!;
    expect(replaced.isDefault).toBe(true);
    expect(replaced.createdAt).toBe(qr.createdAt);
    expect(methods.some((method) => method.id === qr.id)).toBe(false);
    expect(methods.filter((method) => method.isDefault)).toHaveLength(1);
  });

  test('a phone method cannot be replaced by a QR', async () => {
    const service = createFixturePayeeService('demo');
    const phone = (await service.list()).find((method) => method.type === 'duitnow_id')!;
    await expect(
      service.replaceQr(phone.id, { type: 'duitnow_qr', ...FIXTURE_QR.tngDetails }),
    ).rejects.toThrow();
  });

  test('a bank account needs a bank code or a bank name, not both', async () => {
    const service = createFixturePayeeService('empty');
    const bank = { type: 'bank_account', accountNumber: '1234567890', displayName: 'LIM' } as const;
    await expect(service.add({ ...bank, bankCode: null, bankName: null })).rejects.toThrow();
    await expect(
      service.add({ ...bank, bankCode: '588734', bankName: 'Maybank' }),
    ).rejects.toThrow();
    await service.add({ ...bank, bankCode: null, bankName: 'Bank Rakyat' });
    expect(await service.list()).toHaveLength(1);
  });

  test('editing a phone keeps checkedAt; re-saving a QR refreshes it', async () => {
    const service = createFixturePayeeService('demo');
    const [phone, , qr] = await service.list();
    await service.update(phone.id, {
      type: 'duitnow_id',
      phone: '+60123456780',
      displayName: 'LIM',
    });
    await service.update(qr.id, { type: 'duitnow_qr', ...FIXTURE_QR.tngDetails });
    const after = await service.list();
    expect(after.find((m) => m.id === phone.id)!.checkedAt).toBe(phone.checkedAt);
    expect(Date.parse(after.find((m) => m.id === qr.id)!.checkedAt)).toBeGreaterThan(
      Date.parse(qr.checkedAt),
    );
  });

  test('the worst fixture has seven transfer methods including a named bank', async () => {
    const methods = await createFixturePayeeService('worst').list();
    expect(methods.filter((m) => m.type !== 'cash')).toHaveLength(7);
    expect(methods.some((m) => m.type === 'bank_account' && m.bankName !== null)).toBe(true);
  });

  test('updating or removing a missing id fails', async () => {
    const service = createFixturePayeeService('demo');
    await expect(service.remove('missing')).rejects.toThrow();
    await expect(service.update('missing', { type: 'cash' })).rejects.toThrow();
  });
});

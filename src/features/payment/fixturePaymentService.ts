import type { FixtureVariant } from '@/lib/fixtureVariant';
import type { PayeeDetails, PayeeMethod } from '@/lib/payeeMethods';

import type { Payment, PaymentService } from './types';

export const FIXTURE_USER_ID = '00000000-0000-4000-8000-000000000001';
export const FIXTURE_PAYMENT_IDS = {
  owe: 'fixture-owe',
  owed: 'fixture-owed',
  owedCash: 'fixture-owed-cash',
} as const;

export const PAY_METHOD_MIXES = ['all', 'wallets', 'alipay', 'duitnow', 'cash', 'none'] as const;
export type PayMethodMix = (typeof PAY_METHOD_MIXES)[number];

const PAYEE_ID = 'fixture-payee';
const PAYER_ID = 'fixture-payer';

type People = { payee: string; payer: string; payeeBankName: string };

const PEOPLE: Record<FixtureVariant, People> = {
  demo: { payee: '阿杰', payer: '小林', payeeBankName: 'LIM WEI JIE' },
  empty: { payee: '阿杰', payer: '小林', payeeBankName: 'LIM WEI JIE' },
  worst: {
    payee: 'Wan Nurul Aisyah binti Wan Abdul Rahman',
    payer: '陈美玲 (Tan Mei Ling)',
    payeeBankName: 'WAN NURUL AISYAH BINTI WAN ABDUL RAHMAN AL-HADDAD',
  },
  one: { payee: 'Jo', payer: 'J', payeeBankName: 'JO' },
};

const ITEMS: Record<FixtureVariant, { owe: [string, number]; owed: [string, number] }> = {
  demo: { owe: ['帮取快递', 1500], owed: ['帮带一杯咖啡', 800] },
  empty: { owe: ['帮取快递', 1500], owed: ['帮带一杯咖啡', 800] },
  worst: {
    owe: ['帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便买两杯 Tealive', 1234560],
    owed: ['帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte', 50],
  },
  one: { owe: ['取件', 50], owed: ['咖啡', 100] },
};

const ALIPAY = 'https://qr.alipay.com/fkx19396xyzqnoabcdlfe7d';
const WECHAT = 'wxp://f2f0Xq3d8mZ2XyFqJxQwY-fixture';
const TNG =
  '00020201021126580014A00000061500010106890053022012345678901234567890303UBN5204000053034585802MY5911LIM WEI JIE6012KUALA LUMPUR6304ABCD';

function methodsFor(mix: PayMethodMix, name: string): PayeeDetails[] {
  const alipay: PayeeDetails = { type: 'alipay', payload: ALIPAY, displayName: name };
  const wechat: PayeeDetails = { type: 'wechat', payload: WECHAT, displayName: name };
  const tng: PayeeDetails = {
    type: 'duitnow_qr',
    payload: TNG,
    acquirerId: '890053',
    mcc: '0000',
    name,
  };
  const phone: PayeeDetails = { type: 'duitnow_id', phone: '+60123456789', displayName: name };
  const bank: PayeeDetails = {
    type: 'bank_account',
    bankCode: '588734',
    bankName: null,
    accountNumber: '1234564821',
    displayName: name,
  };
  switch (mix) {
    case 'all':
      return [phone, bank, tng, alipay, wechat, { type: 'cash' }];
    case 'wallets':
      return [alipay, wechat, tng];
    case 'alipay':
      return [alipay];
    case 'duitnow':
      return [phone];
    case 'cash':
      return [{ type: 'cash' }];
    case 'none':
      return [];
  }
}

const stamp = (index: number) => new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString();

function asMethods(details: PayeeDetails[], owner: string): PayeeMethod[] {
  return details.map((detail, index) => ({
    ...detail,
    id: `${owner}-method-${index}`,
    isDefault: index === 0 && detail.type !== 'cash',
    createdAt: stamp(index),
    checkedAt: stamp(index),
  }));
}

export type FixturePaymentOptions = {
  variant: FixtureVariant;
  feed: string | undefined;
  mix: PayMethodMix;
  settledBefore: boolean;
  rate: boolean;
};

export function fixtureFeedKinds(feed: string | undefined, variant: FixtureVariant) {
  if (feed === 'none' || variant === 'empty') return { owe: false, owed: false };
  const chosen = feed ? feed.split(',').map((part) => part.trim()) : ['oweMoney', 'owedToYou'];
  return { owe: chosen.includes('oweMoney'), owed: chosen.includes('owedToYou') };
}

function malaysiaToday() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

export function createFixturePaymentService(options: FixturePaymentOptions): PaymentService {
  const people = PEOPLE[options.variant];
  const items = ITEMS[options.variant];
  const opened = new Date(Date.now() - 10 * 60_000).toISOString();
  const common = { itemKind: 'bounty' as const, nudgedAt: null, createdAt: opened, reverses: null };
  const catalog: Record<string, Payment> = {
    [FIXTURE_PAYMENT_IDS.owe]: {
      ...common,
      id: FIXTURE_PAYMENT_IDS.owe,
      title: items.owe[0],
      amountSen: items.owe[1],
      reference: 'TP-8K2Q',
      state: 'due',
      role: 'payer',
      counterpartId: PAYEE_ID,
      counterpartName: people.payee,
      methodType: null,
      proofPath: null,
      markedPaidAt: null,
    },
    [FIXTURE_PAYMENT_IDS.owed]: {
      ...common,
      id: FIXTURE_PAYMENT_IDS.owed,
      title: items.owed[0],
      amountSen: items.owed[1],
      reference: 'TP-3MZ7',
      state: 'marked_paid',
      role: 'payee',
      counterpartId: PAYER_ID,
      counterpartName: people.payer,
      methodType: 'duitnow_id',
      proofPath: `${FIXTURE_PAYMENT_IDS.owed}/proof.jpg`,
      markedPaidAt: opened,
    },
    [FIXTURE_PAYMENT_IDS.owedCash]: {
      ...common,
      id: FIXTURE_PAYMENT_IDS.owedCash,
      title: items.owed[0],
      amountSen: items.owed[1],
      reference: 'TP-W4HN',
      state: 'due',
      role: 'payee',
      counterpartId: PAYER_ID,
      counterpartName: people.payer,
      methodType: null,
      proofPath: null,
      markedPaidAt: null,
    },
  };
  const kinds = fixtureFeedKinds(options.feed, options.variant);
  const listed: string[] = [
    kinds.owe ? FIXTURE_PAYMENT_IDS.owe : null,
    kinds.owed ? FIXTURE_PAYMENT_IDS.owed : null,
  ].filter((id) => id !== null);
  const payeeMethods = asMethods(methodsFor(options.mix, people.payeeBankName), PAYEE_ID);
  const ownMethods = asMethods(
    methodsFor('duitnow', 'LIN XIAO MO').concat({ type: 'cash' }),
    FIXTURE_USER_ID,
  );
  let settledCount = options.settledBefore ? 1 : 0;

  function find(id: string) {
    const payment = catalog[id];
    if (!payment) throw new Error('payment not found');
    return payment;
  }

  function update(id: string, change: Partial<Payment>) {
    catalog[id] = { ...find(id), ...change };
  }

  return {
    async list() {
      return listed.map((id) => catalog[id]).filter((payment) => payment.state !== 'settled');
    },
    async get(_userId, id) {
      return catalog[id] ?? null;
    },
    async methodsOf(userId) {
      if (userId === PAYEE_ID) return payeeMethods;
      if (userId === FIXTURE_USER_ID) return ownMethods;
      return [];
    },
    async latestRate() {
      return options.rate ? { rateDate: malaysiaToday(), rmPerCny: 0.6122 } : null;
    },
    async uploadProof(paymentId) {
      return `${paymentId}/fixture-proof.jpg`;
    },
    async markPaid(paymentId, methodId, proofPath) {
      const payment = find(paymentId);
      const method = payeeMethods.find((candidate) => candidate.id === methodId);
      if (payment.role !== 'payer' || payment.state !== 'due' || !method || method.type === 'cash')
        throw new Error('cannot mark paid');
      update(paymentId, {
        state: 'marked_paid',
        methodType: method.type,
        proofPath,
        markedPaidAt: new Date().toISOString(),
        nudgedAt: null,
      });
    },
    async undo(paymentId) {
      const payment = find(paymentId);
      if (payment.role !== 'payer' || payment.state !== 'marked_paid')
        throw new Error('cannot undo');
      update(paymentId, { state: 'due', methodType: null, proofPath: null, markedPaidAt: null });
    },
    async confirm(paymentId) {
      const payment = find(paymentId);
      const cash = ownMethods.some((method) => method.type === 'cash');
      if (
        payment.role !== 'payee' ||
        !(payment.state === 'marked_paid' || (payment.state === 'due' && cash))
      )
        throw new Error('cannot confirm');
      const firstSettled = settledCount === 0;
      settledCount += 1;
      update(paymentId, { state: 'settled', methodType: payment.methodType ?? 'cash' });
      return { firstSettled };
    },
    async notReceived(paymentId) {
      const payment = find(paymentId);
      if (payment.role !== 'payee' || payment.state !== 'marked_paid')
        throw new Error('cannot nudge');
      update(paymentId, { nudgedAt: new Date().toISOString() });
    },
  };
}

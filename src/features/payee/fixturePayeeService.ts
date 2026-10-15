import type { FixtureVariant } from '@/lib/fixtureVariant';

import {
  canUpdateInPlace,
  isQrMethod,
  withAdded,
  withDefault,
  withRemoved,
  type PayeeDetails,
  type PayeeMethod,
} from './methods';
import type { PayeeService } from './payeeService';
import { FIXTURE_QR } from './qrFixtures';

const DAY_MS = 86_400_000;
const LONG_NAME = 'NUR AISYAH BINTI MOHD FAKHRUDDIN AL-HADDAD SYED';

function seed(variant: FixtureVariant): PayeeDetails[] {
  if (variant === 'empty') return [];
  if (variant === 'one') return [{ type: 'duitnow_id', phone: '+60123456789', displayName: 'JO' }];
  const name = variant === 'worst' ? LONG_NAME : 'LIM WEI JIE';
  const maybank: PayeeDetails = {
    type: 'bank_account',
    bankCode: '588734',
    bankName: null,
    accountNumber: '1234564821',
    displayName: name,
  };
  if (variant !== 'worst')
    return [
      { type: 'duitnow_id', phone: '+60123456789', displayName: name },
      maybank,
      { type: 'duitnow_qr', ...FIXTURE_QR.tngDetails },
      { type: 'cash' },
    ];
  return [
    { type: 'duitnow_id', phone: '+601112345678', displayName: name },
    {
      type: 'bank_account',
      bankCode: null,
      bankName: 'Bank Kerjasama Rakyat Malaysia Berhad (Bank Rakyat) Cawangan Seri Kembangan',
      accountNumber: '12345678901234564821',
      displayName: name,
    },
    maybank,
    { type: 'duitnow_qr', ...FIXTURE_QR.tngDetails },
    { type: 'duitnow_qr', ...FIXTURE_QR.maybankDetails },
    { type: 'alipay', payload: FIXTURE_QR.alipay },
    { type: 'wechat', payload: FIXTURE_QR.wechat },
    { type: 'cash' },
  ];
}

function assertShape(details: PayeeDetails) {
  if (
    details.type === 'bank_account' &&
    (details.bankCode === null) === (details.bankName === null)
  )
    throw new Error('payee_methods_shape: a bank account has a bank code or a bank name');
}

const STALE_QR_DAYS = 120;

export function createFixturePayeeService(variant: FixtureVariant): PayeeService {
  const start = Date.now();
  let counter = 0;
  const stamp = (offset: number) => new Date(start + offset).toISOString();
  let methods: PayeeMethod[] = [];

  function make(details: PayeeDetails, createdAt: string, checkedAt = createdAt): PayeeMethod {
    counter += 1;
    const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    return { ...details, id, isDefault: false, createdAt, checkedAt };
  }

  function find(id: string) {
    const found = methods.find((method) => method.id === id);
    if (!found) throw new Error('payee method not found');
    return found;
  }

  seed(variant).forEach((details, index) => {
    const created = stamp(-(STALE_QR_DAYS + 10 - index) * DAY_MS);
    const checked = details.type === 'duitnow_qr' ? stamp(-STALE_QR_DAYS * DAY_MS) : created;
    methods = withAdded(methods, make(details, created, checked));
  });

  return {
    async list() {
      return methods;
    },
    async add(details) {
      assertShape(details);
      methods = withAdded(methods, make(details, new Date().toISOString()));
    },
    async update(id, details) {
      const existing = find(id);
      if (!canUpdateInPlace(existing, details))
        throw new Error('payee_methods_shape: the type of a method cannot change');
      assertShape(details);
      const checkedAt = isQrMethod(details) ? new Date().toISOString() : existing.checkedAt;
      methods = methods.map((method) =>
        method.id === id
          ? { ...details, id, isDefault: method.isDefault, createdAt: method.createdAt, checkedAt }
          : method,
      );
    },
    async replaceQr(id, details) {
      const existing = find(id);
      if (!isQrMethod(existing) || !isQrMethod(details)) throw new Error('payee method not found');
      const next = make(details, existing.createdAt, new Date().toISOString());
      methods = methods.map((method) =>
        method.id === id ? { ...next, isDefault: existing.isDefault } : method,
      );
    },
    async remove(id) {
      find(id);
      methods = withRemoved(methods, id);
    },
    async setDefault(id) {
      methods = withDefault(methods, id);
    },
  };
}

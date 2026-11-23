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
    { type: 'alipay', payload: FIXTURE_QR.alipay, displayName: name },
    { type: 'wechat', payload: FIXTURE_QR.wechat, displayName: name },
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

const sameDetails = (method: PayeeMethod, details: PayeeDetails) =>
  Object.entries(details).every(([key, value]) => method[key as keyof PayeeMethod] === value);

function reportedIndex(details: readonly PayeeDetails[]) {
  const bank = details.findIndex((item) => item.type === 'bank_account');
  return bank >= 0 ? bank : details.findIndex((item) => item.type !== 'cash');
}

export function createFixturePayeeService(
  variant: FixtureVariant,
  options: { reported?: boolean } = {},
): PayeeService {
  const start = Date.now();
  let counter = 0;
  const stamp = (offset: number) => new Date(start + offset).toISOString();
  let methods: PayeeMethod[] = [];

  function make(details: PayeeDetails, createdAt: string, checkedAt = createdAt): PayeeMethod {
    counter += 1;
    const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    return { ...details, id, isDefault: false, createdAt, checkedAt, reportedAt: null };
  }

  function find(id: string) {
    const found = methods.find((method) => method.id === id);
    if (!found) throw new Error('payee method not found');
    return found;
  }

  const seeded = seed(variant);
  const reported = options.reported ? reportedIndex(seeded) : -1;
  seeded.forEach((details, index) => {
    const created = stamp(-(STALE_QR_DAYS + 10 - index) * DAY_MS);
    const checked = details.type === 'duitnow_qr' ? stamp(-STALE_QR_DAYS * DAY_MS) : created;
    const method = make(details, created, checked);
    methods = withAdded(
      methods,
      index === reported ? { ...method, reportedAt: stamp(-DAY_MS / 24) } : method,
    );
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
      const checked = isQrMethod(details);
      const checkedAt = checked ? new Date().toISOString() : existing.checkedAt;
      const reportedAt = checked || !sameDetails(existing, details) ? null : existing.reportedAt;
      methods = methods.map((method) =>
        method.id === id
          ? {
              ...details,
              id,
              isDefault: method.isDefault,
              createdAt: method.createdAt,
              checkedAt,
              reportedAt,
            }
          : method,
      );
    },
    async confirm(id) {
      find(id);
      const checkedAt = new Date().toISOString();
      methods = methods.map((method) =>
        method.id === id ? { ...method, checkedAt, reportedAt: null } : method,
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

export const PAYEE_TYPES = [
  'duitnow_id',
  'bank_account',
  'duitnow_qr',
  'alipay',
  'wechat',
  'cash',
] as const;
export type PayeeType = (typeof PAYEE_TYPES)[number];

export type PayeeDetails =
  | { type: 'duitnow_id'; phone: string; displayName: string }
  | {
      type: 'bank_account';
      bankCode: string | null;
      bankName: string | null;
      accountNumber: string;
      displayName: string;
    }
  | { type: 'duitnow_qr'; payload: string; acquirerId: string; mcc: string; name: string }
  | { type: 'alipay' | 'wechat'; payload: string }
  | { type: 'cash' };

export type PayeeMethod = PayeeDetails & {
  id: string;
  isDefault: boolean;
  createdAt: string;
  checkedAt: string;
};

export const RECHECK_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const QR_TYPES: readonly PayeeType[] = ['duitnow_qr', 'alipay', 'wechat'];

export const isQrMethod = (method: { type: PayeeType }) => QR_TYPES.includes(method.type);

export function isRecheckDue(method: PayeeMethod, now: Date) {
  if (!isQrMethod(method)) return false;
  return now.getTime() - Date.parse(method.checkedAt) > RECHECK_DAYS * DAY_MS;
}

export function firstRecheckDue(methods: readonly PayeeMethod[], now: Date) {
  return methods.find((method) => isRecheckDue(method, now)) ?? null;
}

const byCreated = (a: PayeeMethod, b: PayeeMethod) => a.createdAt.localeCompare(b.createdAt);

export function sortMethods(methods: readonly PayeeMethod[]) {
  return [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || byCreated(a, b));
}

export function transferMethods(methods: readonly PayeeMethod[]) {
  return sortMethods(methods.filter((method) => method.type !== 'cash'));
}

export function hasCash(methods: readonly PayeeMethod[]) {
  return methods.some((method) => method.type === 'cash');
}

export function withAdded(methods: readonly PayeeMethod[], added: PayeeMethod): PayeeMethod[] {
  const isDefault = added.type !== 'cash' && !methods.some((method) => method.isDefault);
  return [...methods, { ...added, isDefault }];
}

export function withRemoved(methods: readonly PayeeMethod[], id: string): PayeeMethod[] {
  const removed = methods.find((method) => method.id === id);
  const rest = methods.filter((method) => method.id !== id);
  if (!removed?.isDefault) return rest;
  const next = [...rest].sort(byCreated).find((method) => method.type !== 'cash');
  return rest.map((method) => (method.id === next?.id ? { ...method, isDefault: true } : method));
}

export function withDefault(methods: readonly PayeeMethod[], id: string): PayeeMethod[] {
  const target = methods.find((method) => method.id === id);
  if (!target || target.type === 'cash') return [...methods];
  return methods.map((method) => ({ ...method, isDefault: method.id === id }));
}

export function canUpdateInPlace(method: PayeeMethod, details: PayeeDetails) {
  return method.type === details.type;
}

export function samePayload(methods: readonly PayeeMethod[], payload: string) {
  return methods.find((method) => 'payload' in method && method.payload === payload) ?? null;
}

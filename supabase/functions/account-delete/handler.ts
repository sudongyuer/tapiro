export type UnsettledPayment = {
  id: string;
  title: string;
  counterpartName: string;
  amountSen: number;
  direction: 'owe' | 'owed';
};

export type UnsettledRow = {
  id: string;
  title: string;
  amount_sen: number;
  payer_id: string | null;
  payee_id: string | null;
};

export function toUnsettledPayments(
  userId: string,
  rows: readonly UnsettledRow[],
  names: Readonly<Record<string, string>>,
): UnsettledPayment[] {
  return rows.map((row) => {
    const owe = row.payer_id === userId;
    const counterpart = owe ? row.payee_id : row.payer_id;
    return {
      id: row.id,
      title: row.title,
      counterpartName: (counterpart && names[counterpart]) || '',
      amountSen: row.amount_sen,
      direction: owe ? 'owe' : 'owed',
    };
  });
}

export type AccountDeleteDeps = {
  userIdFromToken(token: string): Promise<string | null>;
  findUnsettledPayments(userId: string): Promise<UnsettledPayment[]>;
  deleteUser(userId: string): Promise<void>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handleAccountDelete(req: Request, deps: AccountDeleteDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  const userId = token ? await deps.userIdFromToken(token) : null;
  if (!userId) return json(401, { error: 'unauthorized' });

  let payments: UnsettledPayment[];
  try {
    payments = await deps.findUnsettledPayments(userId);
  } catch {
    return json(500, { error: 'check_failed' });
  }
  if (payments.length > 0) return json(409, { error: 'unsettled_payments', payments });

  try {
    await deps.deleteUser(userId);
  } catch {
    return json(500, { error: 'delete_failed' });
  }
  return json(200, { deleted: true });
}

export const BNM_RATES_URL = 'https://api.bnm.gov.my/public/exchange-rate';
export const BNM_ACCEPT = 'application/vnd.BNM.API.v1+json';

export type DailyRate = {
  base: 'CNY';
  quote: 'MYR';
  rateDate: string;
  source: 'bnm';
  session: string;
  quotePerBase: number;
};

export type FxRateDeps = {
  authorized(token: string): boolean;
  fetchRates(): Promise<unknown>;
  store(rate: DailyRate): Promise<void>;
};

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

export function parseBnmCny(body: unknown): DailyRate | null {
  const root = record(body);
  const session = record(root?.meta)?.session;
  const rows = root?.data;
  if (typeof session !== 'string' || !/^\d{4}$/.test(session) || !Array.isArray(rows)) return null;
  const cny = rows.map(record).find((row) => row?.currency_code === 'CNY');
  const rate = record(cny?.rate);
  const unit = cny?.unit;
  const middle = rate?.middle_rate;
  const date = rate?.date;
  if (typeof unit !== 'number' || unit <= 0) return null;
  if (typeof middle !== 'number' || !(middle > 0)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    base: 'CNY',
    quote: 'MYR',
    rateDate: date,
    source: 'bnm',
    session,
    quotePerBase: middle / unit,
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function handleFxRate(req: Request, deps: FxRateDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !deps.authorized(token)) return json(401, { error: 'unauthorized' });

  let rate: DailyRate | null;
  try {
    rate = parseBnmCny(await deps.fetchRates());
  } catch {
    return json(502, { error: 'fetch_failed' });
  }
  if (!rate) return json(502, { error: 'unexpected_response' });
  try {
    await deps.store(rate);
  } catch {
    return json(500, { error: 'store_failed' });
  }
  return json(200, rate);
}

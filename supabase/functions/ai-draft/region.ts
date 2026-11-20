export const STOREFRONT_HEADER = 'x-tapiro-storefront';

const AI_CLOSED_STOREFRONTS = new Set(['CHN']);

export function storefrontClosed(req: Request): boolean {
  const claimed = (req.headers.get(STOREFRONT_HEADER) ?? '').trim().toUpperCase();
  return AI_CLOSED_STOREFRONTS.has(claimed);
}

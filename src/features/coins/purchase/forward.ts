export type VerifyAnswer =
  | {
      ok: true;
      status: 'credited' | 'duplicate' | 'revoked';
      balance: number | null;
      coins?: number | null;
    }
  | { ok: false; httpStatus: number | null; error: string };

export type ForwardOutcome =
  | { kind: 'finished'; answer: Extract<VerifyAnswer, { ok: true }> }
  | { kind: 'kept'; answer: Extract<VerifyAnswer, { ok: false }> }
  | { kind: 'finishFailed'; answer: Extract<VerifyAnswer, { ok: true }> };

export async function forwardTransaction(
  transaction: { transactionId: string; jws: string },
  verify: (signedTransaction: string) => Promise<VerifyAnswer>,
  finish: (transactionId: string) => Promise<boolean>,
): Promise<ForwardOutcome> {
  const answer = await verify(transaction.jws);
  if (!answer.ok) return { kind: 'kept', answer };
  const finished = await finish(transaction.transactionId);
  return finished ? { kind: 'finished', answer } : { kind: 'finishFailed', answer };
}

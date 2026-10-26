import type { PaymentRole, PaymentState } from './types';

export type PaymentAction = 'markPaid' | 'undo' | 'confirm' | 'notReceived';

export type ActionContext = {
  role: PaymentRole;
  state: PaymentState;
  payeeTakesCash: boolean;
  methodIsCash?: boolean;
};

export function nextState(action: PaymentAction, context: ActionContext): PaymentState | null {
  const { role, state } = context;
  switch (action) {
    case 'markPaid':
      return role === 'payer' && state === 'due' && !context.methodIsCash ? 'marked_paid' : null;
    case 'undo':
      return role === 'payer' && state === 'marked_paid' ? 'due' : null;
    case 'confirm':
      if (role !== 'payee') return null;
      if (state === 'marked_paid') return 'settled';
      return state === 'due' && context.payeeTakesCash ? 'settled' : null;
    case 'notReceived':
      return role === 'payee' && state === 'marked_paid' ? 'marked_paid' : null;
  }
}

export function availableActions(context: Omit<ActionContext, 'methodIsCash'>) {
  return (['markPaid', 'undo', 'confirm', 'notReceived'] as const).filter(
    (action) => nextState(action, context) !== null,
  );
}

export const isUnsettled = (state: PaymentState) => state !== 'settled';

export const sheetTitleKey = (role: PaymentRole | null) =>
  role === 'payee' ? ('pay.sheet.titlePayee' as const) : ('pay.sheet.title' as const);

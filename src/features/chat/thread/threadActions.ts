import { createContext } from 'react';

export type ReportTarget = { userId: string; messageId: string | null };

export type ThreadActions = {
  report: (target: ReportTarget) => void;
  reveal: (key: string) => void;
};

export const ThreadActionsContext = createContext<ThreadActions>({
  report: () => undefined,
  reveal: () => undefined,
});

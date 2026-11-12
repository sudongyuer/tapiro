import { createContext } from 'react';

import type { MessageTranslator } from '@/lib/translation';

export type ReportTarget = { userId: string; messageId: string | null };

export type ThreadActions = {
  report: (target: ReportTarget) => void;
  reveal: (key: string) => void;
  translator: MessageTranslator | null;
};

export const ThreadActionsContext = createContext<ThreadActions>({
  report: () => undefined,
  reveal: () => undefined,
  translator: null,
});

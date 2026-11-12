import { useSyncExternalStore } from 'react';

import type { Language } from '@/lib/i18n';
import type { MessageTranslator, Translation } from '@/lib/translation';

const quiet = () => () => undefined;

export function useMessageTranslation(
  translator: MessageTranslator | null,
  messageId: string | null,
  to: Language,
): Translation | null {
  return useSyncExternalStore(translator?.subscribe ?? quiet, () =>
    translator && messageId ? translator.get(messageId, to) : null,
  );
}

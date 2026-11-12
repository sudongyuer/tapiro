import type { TFunction } from 'i18next';
import type { ContextMenuAction } from 'tapiro-kit';

import type { Translation } from '@/lib/translation';

export function bubbleMenu(
  t: TFunction,
  {
    translatable,
    translation,
    reportable,
  }: {
    translatable: boolean;
    translation: Translation | null;
    reportable: boolean;
  },
): ContextMenuAction[] {
  const translate: ContextMenuAction[] = !translatable
    ? []
    : translation === null
      ? [{ id: 'translate', title: t('chat.thread.translate'), systemImage: 'translate' }]
      : translation.state === 'waiting'
        ? []
        : [
            {
              id: 'hideTranslation',
              title: t('chat.thread.hideTranslation'),
              systemImage: 'eye.slash',
            },
          ];
  return [
    { id: 'copy', title: t('chat.thread.copy'), systemImage: 'doc.on.doc' },
    ...translate,
    ...(reportable
      ? [
          {
            id: 'report',
            title: t('chat.thread.report'),
            systemImage: 'exclamationmark.bubble',
            separate: true,
          },
        ]
      : []),
  ];
}

import type { TFunction } from 'i18next';

export const messageText = (body: string, hasImage: boolean, t: TFunction) =>
  body === '' && hasImage ? t('chat.list.image') : body;

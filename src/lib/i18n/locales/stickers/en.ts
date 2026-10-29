import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  book: {
    title: 'Done together',
    sub: 'One more each time a job gets done and paid',
    summary: '{{total}} · {{sub}}',
  },
  count_one: '{{count}} sticker',
  count_other: '{{count}} stickers',
  empty: {
    title: 'No stickers yet',
    body: 'Help someone or get help. Once it’s done and paid, the sticker lands here.',
  },
  label: {
    payee: 'Helped {{name}}',
    payer: '{{name}} helped me',
    payeeUnnamed: 'Helped a fellow student',
    payerUnnamed: 'A fellow student helped me',
    ride: 'With {{name}}',
    rideUnnamed: 'With a fellow student',
    a11y: '{{line1}}, {{title}}, {{date}}',
  },
  loading: 'Loading stickers',
  loadFailed: {
    title: 'Couldn’t load your stickers',
    body: 'Check your connection and try again.',
  },
  stale: 'Couldn’t refresh your stickers. These are from the last load.',
  retry: 'Try Again',
};

export default en;

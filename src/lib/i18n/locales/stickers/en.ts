import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  book: {
    title: 'Helped out',
    sub: 'One more each time you help out and get paid',
    summary: '{{total}} · {{sub}}',
  },
  count_one: '{{count}} sticker',
  count_other: '{{count}} stickers',
  cell: '{{title}} · {{date}}',
  empty: {
    title: 'No stickers yet',
    body: 'Help someone out and get paid, and that errand’s sticker lands here.',
  },
  loading: 'Loading stickers',
  loadFailed: {
    title: 'Couldn’t load your stickers',
    body: 'Check your connection and try again.',
  },
  retry: 'Try Again',
};

export default en;

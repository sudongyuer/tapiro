import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  book: {
    title: 'Bantuan saya',
    sub: 'Satu lagi setiap kali anda membantu dan dibayar',
    summary: '{{total}} · {{sub}}',
  },
  count_one: '{{count}} pelekat',
  count_other: '{{count}} pelekat',
  cell: '{{title}} · {{date}}',
  empty: {
    title: 'Belum ada pelekat',
    body: 'Bantu seseorang dan dibayar, pelekat tugasan itu akan ditampal di sini.',
  },
  loading: 'Memuatkan pelekat',
  loadFailed: {
    title: 'Pelekat tidak dapat dimuatkan',
    body: 'Semak sambungan anda dan cuba lagi.',
  },
  retry: 'Cuba Lagi',
};

export default ms;

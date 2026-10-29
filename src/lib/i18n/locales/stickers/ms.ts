import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  book: {
    title: 'Selesai bersama',
    sub: 'Satu lagi setiap kali urusan selesai dan dibayar',
    summary: '{{total}} · {{sub}}',
  },
  count_one: '{{count}} pelekat',
  count_other: '{{count}} pelekat',
  cell: '{{title}} · {{date}}',
  empty: {
    title: 'Belum ada pelekat',
    body: 'Bantu atau dibantu. Setelah selesai dan dibayar, pelekatnya ditampal di sini.',
  },
  label: {
    payee: 'Bantu {{name}}',
    payer: '{{name}} bantu saya',
    payeeUnnamed: 'Bantu seorang pelajar',
    payerUnnamed: 'Seorang pelajar bantu saya',
    ride: 'Bersama {{name}}',
    rideUnnamed: 'Bersama seorang pelajar',
    a11y: '{{line1}}, {{title}}, {{date}}',
  },
  loading: 'Memuatkan pelekat',
  loadFailed: {
    title: 'Pelekat tidak dapat dimuatkan',
    body: 'Semak sambungan anda dan cuba lagi.',
  },
  stale: 'Pelekat tidak dapat dikemas kini. Ini daripada muatan terakhir.',
  retry: 'Cuba Lagi',
};

export default ms;

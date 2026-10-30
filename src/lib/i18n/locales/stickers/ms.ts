import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  book: {
    title: 'Selesai bersama',
    sub: 'Satu lagi setiap kali urusan selesai dan dibayar',
    summary: '{{total}} · {{sub}}',
    view: { stack: 'Kad', calendar: 'Kalendar', a11y: 'Paparan' },
  },
  count_one: '{{count}} pelekat',
  count_other: '{{count}} pelekat',
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
  },
  card: {
    position: 'Kad {{index}} daripada {{total}}',
    a11y: '{{date}}, {{line1}}, {{title}}',
    hint: 'Leret untuk menyelak kad',
  },
  calendar: {
    summary_one: '{{count}} selesai',
    summary_other: '{{count}} selesai',
    previous: 'Bulan Sebelumnya',
    next: 'Bulan Seterusnya',
    day: '{{date}}',
    dayDone_one: '{{date}}, {{count}} selesai: {{titles}}',
    dayDone_other: '{{date}}, {{count}} selesai: {{titles}}',
    join: ', ',
    open: 'Membuka kad hari itu',
  },
  art: {
    parcel: 'bungkusan',
    tea: 'secawan teh susu',
    bag: 'beg membeli-belah',
    food: 'semangkuk nasi',
    medicine: 'botol ubat',
    queue: 'tiket giliran',
    document: 'borang bercop',
    move: 'kotak pindah',
    study: 'buku dan pensel',
    accompany: 'dua orang berjalan bersama',
    car: 'kereta',
    other: 'seekor kucing',
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

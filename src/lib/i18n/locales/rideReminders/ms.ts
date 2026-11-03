import type { Translation } from '../../resources';

const reminders: Translation['rideReminders'] = {
  meetup: {
    title: 'Masa berkumpul bermula · {{route}}',
    body: 'Bertolak dalam 30 minit. Di tempat berkumpul, ketik Saya Sudah Sampai dalam Tapiro.',
  },
  goOrCancel: {
    title_one: '{{count}} tempat masih kosong · {{route}}',
    title_other: '{{count}} tempat masih kosong · {{route}}',
    body: 'Bertolak dalam 15 minit dan tumpangan belum penuh. Teruskan atau batalkan?',
  },
  arrive: {
    title: 'Sudah sampai? · {{route}}',
    body: 'Setelah sampai, ketik Sudah sampai · bahagi tambang dan masukkan jumlah Grab.',
    bodyGrab: 'Setelah sampai, ketik Sudah sampai dan tumpangan ini selesai.',
  },
  pay: {
    title: '{{amount}} belum dibayar kepada {{name}}',
    body: 'Tambang anda untuk {{route}}. Selepas 7 hari tidak dibayar, siaran ganjaran dan tumpangan digantung.',
  },
};

export default reminders;

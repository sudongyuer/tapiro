import type { Translation } from '../resources';

const ms: Translation = {
  account: {
    signIn: {
      google: 'Log masuk dengan Google',
      error: {
        notConfigured: 'Log masuk belum disediakan lagi.',
        cancelled: 'Log masuk dibatalkan.',
        failed: 'Tidak dapat log masuk. Cuba lagi.',
        network: 'Tiada sambungan. Cuba lagi apabila dalam talian.',
      },
    },
  },
  debug: {
    title: 'Nyahpepijat',
    account: {
      title: 'Log masuk',
      loading: 'Menyemak log masuk',
      signedOut: 'Belum log masuk',
      signedIn: 'Log masuk sebagai {{name}}',
    },
    tokens: {
      title: 'Token reka bentuk',
      roleSample: 'Ganjaran {{role}}',
      reward: 'RM 15',
      statusOpen: 'Terbuka',
      statusActive: 'Sedang berjalan',
      statusPending: 'Menunggu pengesahan',
      statusDone: 'Selesai',
      statusUrgent: 'Segera',
      accept: 'Terima',
      posted: 'Ganjaran anda telah disiarkan',
    },
  },
};

export default ms;

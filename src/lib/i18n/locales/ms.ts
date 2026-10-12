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
    welcome: {
      title: 'Selamat datang ke Tapiro',
      tagline: 'Pelajar di Malaysia, saling membantu antara satu sama lain.',
    },
    name: {
      title: 'Nama Anda',
      label: 'Nama',
      placeholder: 'Masukkan nama anda',
      footer: 'Pelajar lain akan melihat nama ini. Maksimum 40 aksara.',
      avatar: 'Foto profil',
      continue: 'Teruskan',
      error: {
        empty: 'Masukkan nama.',
        tooLong: 'Gunakan 40 aksara atau kurang.',
        saveFailed: 'Nama anda tidak dapat disimpan. Cuba lagi.',
      },
    },
    language: {
      title: 'Bahasa',
      footer: 'Tapiro mengikut bahasa sistem anda. Anda boleh menukarnya kemudian dalam Tetapan.',
      done: 'Mula Sekarang',
    },
    home: {
      title: 'Utama',
      greeting: 'Hai, {{name}}',
      comingSoon: 'Ganjaran dan tumpangan akan tiba tidak lama lagi.',
      settings: 'Tetapan',
    },
    settings: {
      title: 'Tetapan',
      language: 'Bahasa',
      signOut: 'Log Keluar',
      deleteAccount: 'Padam Akaun',
      deleteFooter: 'Akaun yang telah dipadam tidak boleh dipulihkan.',
    },
    delete: {
      title: 'Padam Akaun Anda?',
      intro: 'Tindakan ini memadam secara kekal:',
      items: {
        profile: 'Profil anda (nama dan foto)',
        payee: 'Kaedah anda menerima bayaran',
        messages: 'Mesej dan ulasan yang anda tulis',
        memory: 'Perkara yang Tapir ingat tentang anda',
        coins: 'Syiling Tapir anda',
        stickers: 'Pelekat anda',
      },
      confirm: 'Padam Akaun',
      cancel: 'Batal',
      deleting: 'Memadam akaun',
      payment: {
        owe: 'Anda bayar {{name}} {{amount}}',
        owed: '{{name}} bayar anda {{amount}}',
      },
      error: {
        blocked:
          'Anda masih ada bayaran yang belum diselesaikan. Selesaikannya sebelum memadam akaun anda.',
        failed: 'Akaun anda tidak dapat dipadam. Cuba lagi.',
        network: 'Tiada sambungan. Cuba lagi apabila dalam talian.',
        signedOut: 'Anda sudah log keluar.',
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
      scenes: {
        welcome: 'Selamat datang',
        profileSetup: 'Langkah nama (nama panjang)',
        settings: 'Tetapan (nama panjang)',
        deleteBlocked: 'Padam akaun (bayaran belum selesai)',
      },
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

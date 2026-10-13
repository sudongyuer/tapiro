import type { Translation } from '../resources';

const ms: Translation = {
  account: {
    signIn: {
      google: 'Daftar masuk dengan Google',
      error: {
        notConfigured: 'Daftar masuk belum disediakan lagi.',
        cancelled: 'Daftar masuk dibatalkan.',
        failed: 'Tidak dapat daftar masuk. Cuba lagi.',
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
      signOut: 'Daftar Keluar',
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
      signOut: 'Daftar Keluar',
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
        signedOut: 'Anda sudah daftar keluar.',
      },
    },
  },
  debug: {
    title: 'Nyahpepijat',
    account: {
      title: 'Daftar masuk',
      loading: 'Menyemak daftar masuk',
      signedOut: 'Belum daftar masuk',
      signedIn: 'Daftar masuk sebagai {{name}}',
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
      liveSample: 'Bayar Ah Kit RM 15',
      mascot: 'Maskot tapir',
    },
  },
};

export default ms;

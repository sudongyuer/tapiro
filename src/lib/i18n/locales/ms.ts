import type { Translation } from '../resources';

import bounty from './bounty/ms';
import pay from './pay/ms';
import payee from './payee/ms';
import stickers from './stickers/ms';

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
      wordmark: 'Tapiro',
      tagline: 'Pasang ganjaran. Bantu sambil lalu.',
      hello: 'Hai!',
      headline: 'Tapir teman anda di Malaysia',
      subline: 'Ambil bungkusan, beratur, tumpang balik ke YC: pelajar saling membantu.',
      terms:
        'Dengan meneruskan, anda bersetuju dengan <terms>Terma Penggunaan</terms> dan <privacy>Dasar Privasi</privacy>.',
      examples: {
        parcel: 'Ambil bungkusan · RM 8',
        coffee: 'Belikan kopi · RM 5',
        ticket: 'Ambil nombor giliran · RM 15',
        books: 'Ajar kalkulus · RM 20',
        umbrella: 'Pinjam payung · sehala',
        car: '17:00 ke YC · perlu 1 lagi',
        boba: 'Belikan teh boba · RM 6',
      },
    },
    name: {
      title: 'Nama Anda',
      greeting: 'Mari berkenalan!',
      question: 'Siapa nama anda?',
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
      greeting: 'Satu langkah lagi!',
      question: 'Bahasa mana pilihan anda?',
      footer: 'Tapiro mengikut bahasa sistem anda. Anda boleh menukarnya kemudian dalam Tetapan.',
      done: 'Mula Sekarang',
    },
    legal: {
      draft: 'Draf: teks ini akan diganti sebelum dikeluarkan di App Store.',
      close: 'Tutup',
      contact: 'Hubungi kami: [e-mel hubungan]',
      terms: {
        title: 'Terma Penggunaan',
        aboutTitle: 'Apa Itu Tapiro',
        about:
          'Tapiro membantu pelajar di Malaysia saling membantu: pasang ganjaran, bantu sambil lalu, berkongsi kereta.',
        accountTitle: 'Akaun Anda',
        account:
          'Anda daftar masuk dengan Apple atau Google. Anda boleh memadam akaun dalam Saya → Tetapan; jika ada bayaran yang belum selesai, selesaikannya dahulu.',
        moneyTitle: 'Bayaran dan Syiling',
        money:
          'Pelajar membayar antara satu sama lain terus dalam aplikasi bank atau e-dompet sendiri, atau secara tunai bersemuka; Tapiro tidak mengendalikan bayaran antara pelajar. Syiling dibeli melalui App Store, hanya boleh digunakan dalam Tapiro, dan tidak boleh dihantar kepada orang lain atau ditunaikan.',
      },
      privacy: {
        title: 'Dasar Privasi',
        collectTitle: 'Apa Yang Kami Kumpul',
        collect:
          'Nama, e-mel (alamat geganti Apple diterima) dan foto yang diberikan oleh Apple atau Google semasa daftar masuk; nama paparan pilihan anda; ganjaran dan perjalanan yang anda siarkan, mesej dan imej sembang, serta ulasan; kaedah bayaran yang anda tambah (nombor DuitNow, akaun bank, dan teks yang dibaca daripada kod QR terima, bukan imejnya); tangkapan skrin yang anda lampirkan semasa membayar (dilihat oleh kedua-dua pihak dan moderator); laporan dan sekatan anda; rekod bayaran (siapa membayar siapa, jumlah dan sama ada telah disahkan); lejar syiling dan rekod pembelian App Store anda; serta token peranti untuk pemberitahuan tolak.',
        aiTitle: 'Tanya Tapir',
        ai: 'Hanya selepas anda bersetuju: apa yang anda hantar kepada Tanya Tapir melalui pelayan kami ke Alibaba Cloud Model Studio (Singapura). Perbualan dan draf kekal dalam telefon anda; tempat dan pilihan dalam Tapir Ingat disegerakkan, dan anda boleh melihat serta memadamnya.',
        storeTitle: 'Di Mana Ia Disimpan',
        store:
          'Data disimpan dengan Supabase di Singapura (ap‑southeast‑1). Sesi daftar masuk anda kekal dalam Keychain telefon anda.',
        deleteTitle: 'Memadam Akaun Anda',
        delete:
          'Padam akaun anda dalam Saya → Tetapan → Padam Akaun. Dipadam: profil, kaedah bayaran, mesej dan ulasan anda, Tapir Ingat, syiling dan pelekat. Disimpan: sebelah pihak lain dalam setiap sembang (tanpa mesej anda), serta rekod lejar syiling dan pembelian dalam aplikasi yang dinyahnamakan. Anda tidak boleh memadam semasa ada bayaran belum selesai; Tapiro menunjukkan yang mana satu.',
      },
    },
    me: {
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
  payee,
  pay,
  stickers,
  bounty,
  shell: {
    tabs: {
      bounty: 'Ganjaran',
      ride: 'Tumpangan',
      messages: 'Mesej',
      me: 'Saya',
      askTapir: 'Tanya Tapir',
    },
    home: {
      title: 'Ganjaran',
    },
    ride: {
      emptyTitle: 'Tumpangan akan dibuka tidak lama lagi',
      emptyBody: 'Kongsi kereta balik ke YC dan tambang dibahagikan secara automatik',
    },
    messages: {
      emptyTitle: 'Belum ada mesej',
      emptyBody:
        'Perbualan akan dipaparkan di sini selepas anda mengambil ganjaran atau menyertai tumpangan',
    },
    accessory: {
      label: '{{title}}, {{sub}}',
      withMore: '{{sub}} · {{count}} lagi',
      hint: 'Buka Ganjaran dan kembangkan kad semasa anda',
      money: 'RM',
    },
    ask: {
      title: 'Tanya Tapir',
      subtitle: {
        bounty: 'Di Ganjaran · tulis ganjaran atau cari yang boleh diambil',
        ride: 'Di Tumpangan · cari penumpang dan bahagikan tambang',
        messages: 'Di Mesej · balas atau terjemah',
        me: 'Di Saya · lihat apa yang Tapir ingat',
      },
      prompt: {
        bounty: 'Perlukan bantuan apa? Satu ayat pun cukup',
        ride: 'Siapa nak balik ke YC? Pukul berapa, dari mana?',
        messages: 'Balas Ah Kit, atau terjemah sesuatu',
      },
      suggestions: {
        bounty: { first: 'Ambil bungkusan saya', second: 'Apa yang boleh saya ambil berdekatan?' },
        ride: {
          first: 'Siapa nak balik ke YC pukul 5 petang?',
          second: 'Bahagikan resit Grab ini',
        },
        messages: { first: 'Terjemah mesej Aiman', second: 'Beritahu Ah Kit: tunggu di lobi' },
        writeBounty: 'Tuliskan ganjaran untuk saya',
      },
      mic: 'Bercakap',
      comingSoon: 'Suara dan draf AI akan datang tidak lama lagi',
      close: 'Tutup',
    },
  },
  home: {
    say: {
      payNamed: '{{name}} dah hantar — jangan lupa bayar',
      pay: 'Ada bayaran yang perlu dibuat',
      rideMinutes: 'Bertolak dalam {{count}} minit, jangan lewat',
      owedNamed: '{{name}} kata dah bayar anda — semak',
      progressNamed: '{{name}} sedang membantu — hantar mesej bila-bila',
      live: 'Ada urusan berjalan, Tapir tolong perhatikan',
      calm: 'Tiada apa hari ini… mahu siarkan ganjaran?',
    },
    stage: {
      live: 'Sedang berjalan',
    },
    stack: {
      fanOut: 'Bentangkan · {{count}}',
      collapse: 'Susun',
      fanOutHint: 'Membentangkan kad mengikut ketinggian masing-masing',
      collapseHint: 'Menyusun semula kad',
      peekHint: 'Membentangkan semua kad',
    },
    money: 'RM {{amount}}',
    soon: 'Langkah ini belum dibuka',
    card: {
      waiting: { tag: 'Menunggu pengesahan' },
      unavailable: {
        title: 'Bayaran anda tidak dapat dimuatkan',
        body: 'Kami belum tahu sama ada anda berhutang atau seseorang sudah membayar anda.',
        retry: 'Cuba lagi',
        loading: 'Memuatkan bayaran anda',
      },
      pay: {
        tag: 'Perlu dibayar',
        title: 'Bayar {{name}}',
        button: 'Bayar sekarang',
        buttonLabel: 'Bayar {{amount}} sekarang',
        footer: 'Bayaran terus · wang terus ke {{name}}',
      },
      ride: {
        tag: 'Tumpangan · {{seats}} penuh',
        youBook: 'Anda tempah',
        departs: 'Bertolak {{time}}',
        countdownSuffix: 'lagi',
        countdownLabel: '{{time}} lagi sebelum bertolak',
        meet: 'Titik temu',
        destination: 'Ke',
        arrive: 'Saya sampai',
      },
      owed: {
        tag: 'Perlu disahkan',
        title: '{{name}} kata dah bayar anda',
      },
      progress: {
        tag: 'Siaran anda · sedang berjalan',
        helper: '{{name}} ambil',
        message: 'Mesej {{name}}',
        details: 'Butiran',
      },
      calm: {
        tag: 'Tiada urusan tertunggak hari ini',
        morning: 'Selamat pagi, {{name}}',
        afternoon: 'Selamat petang, {{name}}',
        evening: 'Selamat malam, {{name}}',
        ask: 'Sebut sahaja, Tapir siarkan ganjaran',
        askHint: 'Membuka Tanya Tapir',
        chipRide: 'Siapa balik ke YC pukul lima?',
        chipParcel: 'Ambilkan bungkusan saya',
        chipStudy: 'Cari orang terangkan kalkulus',
      },
    },
    section: {
      title: 'Ganjaran yang boleh anda ambil',
      empty: 'Ganjaran akan tiba dalam keluaran seterusnya',
    },
    strip: {
      label: '{{title}}, {{line}}',
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
        languageStep: 'Langkah bahasa',
        settings: 'Tetapan (nama panjang)',
        deleteBlocked: 'Padam akaun (bayaran belum selesai)',
      },
    },
    pay: { title: 'Helaian bayaran' },
    stickers: { title: 'Buku pelekat' },
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

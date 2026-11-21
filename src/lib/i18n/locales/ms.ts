import type { Translation } from '../resources';

import ask from './ask/ms';
import block from './block/ms';
import chat from './chat/ms';
import coins from './coins/ms';
import liveActivity from './liveActivity/ms';
import bounty from './bounty/ms';
import pay from './pay/ms';
import ride from './ride/ms';
import rideReminders from './rideReminders/ms';
import rideSettle from './rideSettle/ms';
import reputation from './reputation/ms';
import payee from './payee/ms';
import stickers from './stickers/ms';

const ms: Translation = {
  account: {
    signIn: {
      google: 'Daftar masuk dengan Google',
      testAccounts: 'Akaun ujian (pembangunan setempat sahaja)',
      testAccountAs: 'Masuk sebagai {{name}}',
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
        parcel: 'Ambil bungkusan · {{amount}}',
        coffee: 'Belikan kopi · {{amount}}',
        ticket: 'Ambil nombor giliran · {{amount}}',
        books: 'Ajar kalkulus · {{amount}}',
        umbrella: 'Pinjam payung · sehala',
        car: '17:00 ke YC · perlu 1 lagi',
        boba: 'Belikan teh boba · {{amount}}',
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
      signOutTitle: 'Daftar keluar?',
      signOutMessage: 'Anda belum selesai. Anda perlu daftar masuk semula untuk meneruskan.',
      signOutKeep: 'Teruskan Mengisi',
      continue: 'Teruskan',
      loading: 'Memuatkan profil anda',
      loadFailed:
        'Profil anda tidak dapat dimuatkan, jadi nama dan foto anda kekal. Semak sambungan dan cuba lagi.',
      retry: 'Cuba lagi',
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
      contact: 'Hubungi kami: sudongyu3@gmail.com',
      terms: {
        title: 'Terma Penggunaan',
        aboutTitle: 'Apa Itu Tapiro',
        about:
          'Tapiro membantu pelajar di Malaysia saling membantu: pasang ganjaran, bantu sambil lalu, berkongsi kereta.',
        accountTitle: 'Akaun Anda',
        account:
          'Anda daftar masuk dengan Apple atau Google. Anda boleh memadam akaun dalam Saya → Tetapan; jika ada bayaran yang belum langsai, langsaikannya dahulu.',
        moneyTitle: 'Bayaran dan Syiling',
        money:
          'Pelajar membayar antara satu sama lain terus dalam aplikasi bank atau e-dompet sendiri, atau secara tunai bersemuka; Tapiro tidak mengendalikan bayaran antara pelajar. Syiling dibeli melalui App Store, hanya boleh digunakan dalam Tapiro, dan tidak boleh dihantar kepada orang lain atau ditunaikan.',
      },
      privacy: {
        title: 'Dasar Privasi',
        collectTitle: 'Apa Yang Kami Kumpul',
        collect:
          'Nama, e-mel (alamat geganti Apple diterima) dan foto yang diberikan oleh Apple atau Google semasa daftar masuk; nama paparan pilihan anda; ganjaran dan perjalanan yang anda siarkan, mesej dan imej sembang, serta ulasan; kaedah terima bayaran yang anda tambah (nombor DuitNow, akaun bank, dan teks yang dibaca daripada kod QR terima, bukan imejnya); tangkapan skrin yang anda lampirkan semasa membayar (dilihat oleh kedua-dua pihak dan moderator); laporan dan sekatan anda; rekod bayaran (siapa membayar siapa, jumlah dan sama ada telah disahkan); lejar syiling dan rekod pembelian App Store anda; serta token peranti untuk pemberitahuan tolak. Jika anda membenarkan lokasi, Tapiro membaca lokasi anda hanya semasa anda menggunakannya, untuk menyusun ganjaran dan perjalanan berdekatan mengikut jarak, untuk menunjukkan tempat berdekatan dahulu semasa anda mencari tempat, atau untuk menggunakan tempat anda berada sebagai tempat ganjaran atau perjalanan yang anda siarkan. Lokasi anda hanya dihantar bersama carian itu ke pelayan kami atau Apple Maps, dan kami tidak menyimpannya melainkan anda menyiarkannya sebagai tempat ganjaran atau perjalanan.',
        aiTitle: 'Tanya Tapir',
        ai: 'Hanya selepas anda bersetuju: apa yang anda taip atau sebut, gambar yang anda pilih, dan mesej yang anda terjemah dihantar melalui pelayan kami ke Alibaba Cloud Model Studio (Singapura); tempat serta tabiat dalam Tapir Ingat dihantar bersama hanya semasa mendraf dan menjawab, bukan semasa menterjemah atau menukar suara kepada teks. Terma Alibaba Cloud menyatakan ia tidak menggunakan data ini untuk melatih atau menambah baik modelnya. Dasar penyimpanan datanya menyatakan permintaan dan jawapan ini disimpan tidak lebih daripada 30 hari secara lalai, dan mungkin disimpan lebih lama jika dikehendaki oleh undang-undang, untuk keselamatan perkhidmatan, atau jika penapis keselamatannya menandakan kandungan itu. Perbualan dan draf kekal dalam telefon anda; pelayan hanya menyimpan rekod persetujuan dan penggunaan, bukan perbualan; Tapir Ingat disegerakkan, dan anda boleh melihat, mengubah serta memadamnya.',
        storeTitle: 'Di Mana Ia Disimpan',
        store:
          'Data disimpan dengan Supabase di Singapura (ap‑southeast‑1). Sesi daftar masuk anda kekal dalam Keychain telefon anda.',
        deleteTitle: 'Memadam Akaun Anda',
        delete:
          'Padam akaun anda dalam Saya → Tetapan → Padam Akaun. Dipadam: profil, kaedah terima bayaran, mesej dan ulasan anda, Tapir Ingat, syiling dan pelekat. Disimpan: sebelah pihak lain dalam setiap sembang (tanpa mesej anda), serta rekod yang dinyahnamakan bagi lejar syiling, pembelian dalam aplikasi, penggunaan Tanya Tapir dan daun dalam Balang anda. Anda tidak boleh memadam semasa ada bayaran belum langsai; Tapiro menunjukkan yang mana satu.',
      },
    },
    me: {
      settings: 'Tetapan',
    },
    settings: {
      title: 'Tetapan',
      language: 'Bahasa',
      signOut: 'Daftar Keluar',
      signingOut: 'Sedang daftar keluar…',
      deleteAccount: 'Padam Akaun',
      deleteFooter: 'Akaun yang telah dipadam tidak boleh dipulihkan.',
      icp: 'Nombor pemfailan ICP',
      regionNoAi:
        'Tanya Tapir, terjemahan mesej dan input suara tidak ditawarkan dalam Tapiro dari App Store tanah besar China.',
    },
    delete: {
      title: 'Padam Akaun Anda?',
      intro: 'Tindakan ini memadam secara kekal:',
      items: {
        profile: 'Profil anda (nama dan foto)',
        payee: 'Kaedah terima bayaran',
        messages: 'Mesej dan ulasan yang anda tulis',
        memory: 'Perkara yang Tapir ingat tentang anda',
        coins: 'Syiling anda',
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
          'Anda masih ada bayaran yang belum langsai. Langsaikannya sebelum memadam akaun anda.',
        failed: 'Akaun anda tidak dapat dipadam. Cuba lagi.',
        network: 'Tiada sambungan. Cuba lagi apabila dalam talian.',
        signedOut: 'Anda sudah daftar keluar.',
      },
    },
  },
  payee,
  pay,
  stickers,
  block,
  chat,
  coins,
  liveActivity,
  reputation,
  ask,
  bounty,
  ride,
  rideReminders,
  rideSettle,
  keyboard: {
    done: 'Selesai',
  },
  live: {
    offline: 'Mungkin tidak terkini',
    staleAt: 'Mungkin tidak terkini · data pada {{time}}',
  },
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
    accessory: {
      label: '{{title}}, {{sub}}',
      withMore: '{{sub}} · {{count}} lagi',
      hint: 'Buka Ganjaran dan kembangkan kad semasa anda',
    },
    ask: {
      title: 'Tanya Tapir',
      subtitle: {
        bounty: 'Di Ganjaran · tulis ganjaran atau jawab soalan',
        ride: 'Di Tumpangan · jawab soalan atau tulis ganjaran',
        messages: 'Di Mesej · sentuh dan tahan mesej orang lain untuk menterjemahkannya',
        me: 'Di Saya · tulis ganjaran atau jawab soalan',
      },
      prompt: {
        bounty: 'Perlukan bantuan apa? Satu ayat pun cukup',
        ride: 'Tanya apa sahaja, contohnya cara ke lapangan terbang',
        messages: 'Tanya apa sahaja, contohnya maksud satu perkataan',
      },
      suggestions: {
        bounty: {
          first: 'Ambil bungkusan saya',
          second: 'Apa perlu dibawa untuk ambil bungkusan?',
        },
        ride: {
          first: 'Cara paling murah dari Sunway ke KLIA?',
          second: 'Cari orang bawa barang saya balik ke YC',
        },
        messages: {
          first: 'Apa “wait in the lobby” dalam bahasa Melayu?',
          second: 'Macam mana nak beritahu tuan rumah pemanas rosak?',
        },
        writeBounty: 'Tuliskan ganjaran untuk saya',
      },
      mic: 'Bercakap',
      send: 'Hantar',
      close: 'Tutup',
    },
  },
  home: {
    say: {
      payNamed: '{{name}} dah hantar — jangan lupa bayar',
      pay: 'Ada bayaran yang perlu dibuat',
      rideMinutes: 'Bertolak dalam {{count}} minit, jangan lewat',
      owedNamed: '{{name}} kata dah bayar anda — semak',
      settled: '{{name}} dah terima duit, urusan selesai!',
      settledUnnamed: 'Duit dah diterima, urusan selesai!',
      bounty: '{{title}} · {{line}}',
      live: 'Ada urusan berjalan, Tapir tolong perhatikan',
      unavailable: 'Bayaran tidak dapat dimuatkan. Tarik ke bawah untuk cuba lagi',
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
    card: {
      waiting: { tag: 'Menunggu pengesahan' },
      settled: {
        tag: 'Langsai',
        line: '{{title}} · {{name}} sahkan terima',
        lineUnnamed: '{{title}} · Penerimaan disahkan',
        headline: 'Berjaya! Ini pelekat anda',
        collect: 'Simpan ke buku pelekat',
        collected: 'Dalam buku pelekat anda',
        badge: '+1',
        strip: '{{title}} · Selesai',
        a11y: 'Langsai, {{line}}, {{amount}}',
      },
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
      },
      owed: {
        tag: 'Perlu disahkan',
        title: '{{name}} kata dah bayar anda',
      },
      bounty: {
        tag: {
          action: 'Perlu tindakan anda',
          inProgress: 'Sedang berjalan',
          waiting: 'Menunggu pihak lain',
        },
        line: '{{title}} · {{line}}',
        label: '{{title}}, {{line}}, bayaran {{reward}}',
        details: 'Lihat',
        message: 'Mesej',
      },
      calm: {
        tag: 'Tiada urusan tertunggak hari ini',
        morning: 'Selamat pagi, {{name}}',
        afternoon: 'Selamat petang, {{name}}',
        evening: 'Selamat malam, {{name}}',
        ask: 'Sebut sahaja, Tapir tolong draf ganjaran',
        askHint: 'Membuka Tanya Tapir',
        chipHint: 'Membuka Tanya Tapir dengan ayat ini diisi',
        chipQuestion: 'Cara murah ke KLIA?',
        chipParcel: 'Ambilkan bungkusan saya',
        chipStudy: 'Cari orang terangkan kalkulus',
      },
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
        deleteBlocked: 'Padam akaun (bayaran belum langsai)',
      },
    },
    ride: {
      list: 'Senarai tumpangan',
      form: 'Borang tumpangan',
      confirm: 'Sahkan tumpangan',
      detail: 'Butiran tumpangan',
    },
    bounty: {
      post: 'Borang ganjaran',
      confirm: 'Sahkan siaran',
      placeSearch: 'Pilih Tempat',
      board: 'Papan ganjaran',
      map: 'Ganjaran di peta',
      detail: 'Butiran ganjaran',
      applicants: 'Pilih pembantu (pemohon)',
      status: 'Halaman status (keadaan × peranan)',
    },
    pay: { title: 'Helaian bayaran' },
    stickers: { title: 'Buku pelekat' },
    chat: { thread: 'Benang sembang (papan kekunci)' },
    reputation: { profile: 'Profil', review: 'Helaian penilaian', reviewOpen: 'Buka penilaian' },
    coins: { page: 'Halaman Syiling', invite: 'Halaman jemputan' },
    ask: { settings: 'Saya → Tapir' },
    store: {
      title: 'StoreKit hujung ke hujung',
      signIn: 'Log masuk sebagai Xiaolin',
      openCoins: 'Buka Syiling',
      buyKept: 'Daftar keluar, kemudian beli 5',
    },
    liveActivity: {
      title: 'Aktiviti Langsung',
      bountyOnTheWay: 'Ganjaran · dalam perjalanan',
      bountyArrived: 'Ganjaran · sudah sampai (hilang dalam 15 minit)',
      rideMeetupHome: 'Tumpangan · berkumpul (dari rumah)',
      rideMeetupPlace: 'Tumpangan · berkumpul (tempat awam)',
      rideDeparted: 'Tumpangan · sudah bertolak (hilang dalam 15 minit)',
      stale: 'Dalam perjalanan · lapuk dalam 1 minit',
      endNow: 'Tamatkan sekarang',
      list: 'Senarai',
      helper: 'Nurul Aisyah binti Ahmad',
      place: 'Perpustakaan Tun Seri Lanang',
      task: 'Ambil bungkusan di pejabat pos',
      start: 'Sunway Geo Residences',
    },
    flight: {
      title: 'Pelekat terbang ke Saya',
      fly: 'Terbang ke Saya',
      flyReduced: 'Terbang (Kurangkan Gerakan)',
      reset: 'Letak semula pelekat',
    },
    map: {
      title: 'Pelekat peta',
      near: 'Zum masuk',
      far: 'Zum keluar',
      me: 'Dari saya',
      place: 'Dari sini',
    },
    tokens: {
      title: 'Token reka bentuk',
      roleSample: 'Ganjaran {{role}}',
      reward: '{{amount}}',
      statusOpen: 'Terbuka',
      statusActive: 'Sedang berjalan',
      statusPending: 'Menunggu pengesahan',
      statusDone: 'Selesai',
      statusUrgent: 'Segera',
      accept: 'Terima',
      posted: 'Ganjaran anda telah disiarkan',
      liveSample: 'Bayar Ah Kit {{amount}}',
      mascot: 'Maskot tapir',
      hold: 'Tahan untuk pilih Ah Kit',
      holdHolding: 'Terus tahan…',
      holdBusy: 'Memilih…',
      holdHint: 'Tahan kira-kira 1 saat',
    },
  },
};

export default ms;

import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  title: 'Kaedah Terima Bayaran',
  meRow: 'Kaedah Terima Bayaran',
  meRowDue: 'Kod QR perlu disemak semula',
  privacy:
    'Hanya pembayar yang memilih anda nampak maklumat ini semasa membayar, dan ia disembunyikan selepas selesai.',
  emptyTitle: 'Belum ada kaedah terima bayaran',
  emptyBody: 'Tambah satu supaya pembayar tahu cara membayar anda.',
  add: 'Tambah Kaedah',
  default: 'Lalai',
  makeDefault: 'Jadikan Lalai',
  delete: 'Padam',
  cancel: 'Batal',
  deleteConfirm: {
    title: 'Padam kaedah ini?',
    body: 'Pembayar tidak akan nampak kaedah ini lagi.',
  },
  loading: 'Memuatkan',
  loadFailed: {
    title: 'Kaedah terima bayaran tidak dapat dimuatkan',
    body: 'Semak sambungan anda dan cuba lagi.',
  },
  retry: 'Cuba Lagi',
  actionFailed: 'Tidak berjaya. Semak sambungan anda dan cuba lagi.',
  menuOther: 'Lain-lain',
  deleteMethod: 'Padam Kaedah Ini',
  close: 'Tutup',
  save: 'Simpan',
  types: {
    duitnow_id: 'Nombor Telefon DuitNow',
    bank_account: 'Akaun Bank',
    duitnow_qr: 'Kod QR {{bank}}',
    duitnow_qr_generic: 'Kod QR DuitNow',
    alipay: 'Kod Terima Alipay',
    wechat: 'Kod Terima WeChat',
    tng: 'Kod QR TNG',
    cash: 'Tunai Bersemuka',
  },
  detail: {
    joined: '{{first}} · {{second}}',
    business: 'QR Perniagaan',
    alipay: 'Dikenal pasti · untuk pembayar yang guna Alipay',
    wechat: 'Dikenal pasti · untuk pembayar yang guna WeChat',
  },
  cash: {
    header: 'Bersemuka',
    toggle: 'Terima tunai secara bersemuka',
  },
  recheck: {
    title: '{{method}} anda belum disemak selama 90 hari',
    body: 'Pilih tangkapan skrin sekali lagi supaya bayaran masih sampai kepada anda.',
    action: 'Pilih Semula',
  },
  form: {
    phoneLabel: 'Telefon',
    phonePlaceholder: '012-345 6789',
    nameLabel: 'Nama yang dipaparkan oleh bank',
    namePlaceholder: 'Seperti dalam aplikasi bank',
    nameFooter:
      'Bank pembayar memaparkan nama ini semasa pindahan. Jika tidak sepadan, mereka tidak akan membayar.',
    bankLabel: 'Bank',
    bankPlaceholder: 'Pilih Bank',
    otherBank: 'Bank Lain',
    bankNameLabel: 'Nama bank',
    bankNamePlaceholder: 'cth. Bank Rakyat',
    accountLabel: 'Nombor akaun',
    accountFooter: 'Digit sahaja. Hanya 4 digit terakhir dipaparkan selepas disimpan.',
    error: {
      phoneEmpty: 'Masukkan nombor telefon.',
      phoneInvalid: 'Masukkan nombor telefon bimbit Malaysia, cth. 012-345 6789.',
      nameEmpty: 'Masukkan nama yang dipaparkan oleh bank.',
      nameInvalid: 'Gunakan 60 aksara atau kurang.',
      bankEmpty: 'Pilih bank.',
      bankNameEmpty: 'Masukkan nama bank.',
      bankNameInvalid: 'Nama bank mestilah 60 aksara atau kurang.',
      accountEmpty: 'Masukkan nombor akaun.',
      accountInvalid: 'Nombor akaun ialah 6 hingga 20 digit.',
      saveFailed: 'Tidak dapat disimpan. Cuba lagi.',
    },
  },
  qr: {
    title: 'Kod QR',
    hint: 'Dalam aplikasi bank atau TNG, buka Terima / Kongsi QR → simpan ke Foto, kemudian pilih di sini.',
    pick: 'Pilih Tangkapan Skrin',
    scan: 'Imbas dengan Kamera',
    footer:
      'Memilih dari Foto tidak memerlukan kebenaran. Akses kamera hanya diminta semasa mengimbas.',
    typeLabel: 'Jenis',
    payeeLabel: 'Penerima',
    typeDuitNow: 'DuitNow · {{bank}}',
    typeBusiness: 'DuitNow · {{bank}} · Perniagaan',
    seen: 'Pembayar akan nampak: {{name}} · {{bank}}',
    seenWallet: 'Pembayar akan nampak: {{method}}',
    note: 'Pembayar nampak nama dan bank ini semasa membayar. Hanya kandungan kod disimpan, bukan gambar.',
    walletNote:
      'Tapiro tidak dapat menyemak kod Alipay dan WeChat. Pastikan ini kod terima anda sendiri. Hanya kandungan kod disimpan, bukan gambar.',
    retry: 'Pilih Lain',
    nameLabel: {
      alipay: 'Nama yang dipaparkan oleh Alipay',
      wechat: 'Nama yang dipaparkan oleh WeChat',
    },
    namePlaceholder: { alipay: 'Seperti dalam Alipay', wechat: 'Seperti dalam WeChat' },
    nameFooter: {
      alipay:
        'Alipay memaparkan nama sebenar anda semasa pembayaran. Pembayar menggunakannya untuk menyemak.',
      wechat:
        'WeChat memaparkan nama sebenar anda semasa pembayaran. Pembayar menggunakannya untuk menyemak.',
    },
    nameError: {
      empty: 'Masukkan nama yang dipaparkan oleh {{wallet}}.',
      invalid: 'Gunakan 60 aksara atau kurang.',
    },
    steps: {
      alipay:
        '1. Buka Alipay → Terima (收钱) di skrin utama\n2. Ketik Simpan Gambar\n3. Kembali dan pilih gambar itu di bawah',
      wechat:
        '1. Buka WeChat → Saya → Perkhidmatan → Wang → Terima Wang\n2. Ketik Simpan Kod Wang\n3. Kembali dan pilih gambar itu di bawah',
      tng: '1. Buka TNG eWallet → Receive\n2. Simpan gambar QR ke Foto\n3. Kembali dan pilih gambar itu di bawah',
    },
    wallet: { alipay: 'Alipay', wechat: 'WeChat' },
    mismatch: 'Ini kod {{wallet}}. Simpan sebagai {{method}}?',
    error: {
      noCode: { title: 'Tiada kod QR ditemui', body: 'Pangkas lebih dekat dan cuba lagi.' },
      payingCode: {
        title: 'Ini kod bayar, bukan kod terima.',
        body: 'Sesiapa yang ada kod bayar boleh mengenakan caj kepada anda, jadi ia disekat dan tidak disimpan. Buka Terima dalam Alipay, WeChat, TNG atau aplikasi bank dan ambil tangkapan skrin itu (kod bayar DuitNow juga tidak boleh digunakan).',
      },
      merchantOrder: {
        title: 'Ini kod pesanan peniaga, bukan kod terima',
        body: 'Kod ini luput dalam 2 jam. Dalam WeChat, buka Wang → Terima Wang dan simpan kod terima anda.',
      },
      badCrc: {
        title: 'Kod ini rosak',
        body: 'Kandungannya tidak sah, mungkin kerana dimampatkan atau dipangkas. Simpan semula dari aplikasi bank.',
      },
      dynamic: {
        title: 'Kod ini ada jumlah dan luput dalam 60 saat',
        body: 'Simpan kod terima tanpa jumlah dari aplikasi bank.',
      },
      hasAmount: {
        title: 'Kod ini ada jumlah tetap',
        body: 'Setiap bayaran berbeza. Simpan kod terima tanpa jumlah.',
      },
      unknown: {
        title: 'Kod tidak dikenali',
        body: 'Hanya kod QR DuitNow / TNG serta kod terima Alipay dan WeChat disokong.',
      },
      denied: {
        title: 'Tiada akses kamera',
        body: 'Hidupkan akses kamera untuk Tapiro dalam Tetapan, atau pilih tangkapan skrin.',
      },
      unavailable: {
        title: 'Imbasan tidak tersedia pada peranti ini',
        body: 'Pilih tangkapan skrin.',
      },
      failed: { title: 'Gambar itu tidak dapat dibaca', body: 'Pilih sekali lagi.' },
    },
  },
};

export default ms;

import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  status: {
    progress: 'Kemajuan',
    summary: {
      poster: {
        assigned: '{{name}} ambil',
        late: '{{name}} belum bertolak',
        enRoute: '{{name}} dalam perjalanan',
        done: 'Menunggu anda sahkan',
        disputed: 'Menunggu {{name}} selesaikan',
        confirmed: 'Sedia untuk anda bayar',
        settled: 'Selesai',
        cancelled: 'Ganjaran ini dibatalkan',
      },
      helper: {
        assigned: 'Masa untuk bertolak',
        late: 'Masa untuk bertolak · sudah lewat',
        enRoute: 'Anda dalam perjalanan',
        done: 'Menunggu {{name}} sahkan',
        disputed: '{{name}} laporkan masalah',
        confirmed: 'Menunggu {{name}} membayar',
        settled: 'Selesai',
        cancelled: 'Ganjaran ini dibatalkan',
      },
    },
    step: {
      poster: {
        selected: 'Anda memilih {{name}}',
        started: '{{name}} bertolak',
        completed: '{{name}} tandakan siap',
        confirm: 'Anda sahkan siap',
        confirmed: 'Anda sudah sahkan',
        paid: 'Bayar {{name}} {{amount}}',
      },
      helper: {
        selected: '{{name}} memilih anda',
        start: 'Bertolak',
        started: 'Anda bertolak',
        complete: 'Siap',
        completed: 'Anda tandakan siap',
        confirmed: '{{name}} sahkan',
        paid: 'Terima {{amount}}',
      },
    },
    note: {
      departBy: 'Janji bertolak sebelum {{time}}. Ketik di bawah semasa keluar.',
      departByPoster: 'Janji bertolak sebelum {{time}}',
      late_one: 'Janji bertolak sebelum {{time}}, sudah lewat {{count}} minit',
      late_other: 'Janji bertolak sebelum {{time}}, sudah lewat {{count}} minit',
      lateHours_one: 'Janji bertolak sebelum {{time}}, sudah lewat {{count}} jam',
      lateHours_other: 'Janji bertolak sebelum {{time}}, sudah lewat {{count}} jam',
      eta: 'Dijangka tiba {{time}}',
      saidDone: '{{name}} kata sudah siap · {{time}}',
      autoConfirmPoster_one:
        'Jika anda tidak bertindak, disahkan secara automatik pada {{date}} ({{count}} jam lagi)',
      autoConfirmPoster_other:
        'Jika anda tidak bertindak, disahkan secara automatik pada {{date}} ({{count}} jam lagi)',
      autoConfirmHelper: 'Jika {{name}} tidak bertindak, disahkan secara automatik pada {{date}}',
      reason: '“{{reason}}”',
      disputeHelper: 'Selepas selesai, ketik Siap sekali lagi. Kiraan 48 jam bermula semula.',
      yourReason: 'Anda kata: “{{reason}}”',
      disputePoster:
        'Pengesahan automatik dihentikan. Kiraan 48 jam bermula semula apabila {{name}} ketik Siap lagi.',
      payPoster: 'Wang terus ke {{name}}. Selepas bayar, ketik “Saya sudah bayar”.',
      payHelper: '{{name}} bayar terus kepada anda. Ketik “Diterima” apabila sampai.',
    },
    action: {
      start: 'Bertolak',
      changeEta: 'Tukar Masa Tiba',
      complete: 'Siap',
      completeAgain: 'Sudah Selesai, Ketik Siap Lagi',
      confirm: 'Sahkan Siap',
      problem: 'Ada Masalah',
      pay: 'Bayar Sekarang',
      view: 'Lihat Kemajuan',
      more: 'Lagi',
      cancel: 'Batalkan Ganjaran',
      withdraw: 'Tarik Diri',
      sending: 'Menghantar',
    },
    failed: 'Gagal dihantar. Cuba lagi.',
    stateChanged: 'Status ganjaran ini sudah berubah',
    cancelled: 'Ganjaran ini dibatalkan',
    loading: 'Memuatkan ganjaran ini',
    loadFailed: 'Ganjaran ini tidak dapat dimuatkan',
    refreshFailed: 'Gagal muat semula · ini data pukul {{time}} dan mungkin sudah berubah.',
    retry: 'Cuba Lagi',
    a11y: {
      step: '{{label}}, {{state}}',
      done: 'selesai',
      current: 'langkah semasa',
      needsYou: 'perlu tindakan anda',
      upcoming: 'belum lagi',
    },
  },
  eta: {
    title: 'Pukul berapa anda sampai?',
    changeTitle: 'Tukar Masa Tiba',
    body: '{{name}} akan nampak masa ini. Anda boleh tukar dalam perjalanan.',
    picker: 'Masa tiba',
    ok: 'OK',
    start: 'Bertolak',
    cancel: 'Batal',
    changed: '{{name}} tukar masa pada {{time}}',
    changedSelf: 'Anda tukar masa pada {{time}}',
    previous: 'Asalnya {{time}}',
  },
  issue: {
    title: 'Kepada {{name}}',
    placeholder: 'Apa yang tak kena? Tulis sebaris',
    footer:
      '{{name}} akan nampak ini. Pengesahan automatik dihentikan; selepas {{name}} selesaikan dan ketik Siap lagi, kiraan 48 jam bermula semula.',
    count: '{{count}}/{{max}}',
    countLabel: '{{count}} daripada {{max}} aksara',
    empty: 'Tulis apa yang tak kena',
    tooLong: 'Maksimum {{max}} aksara',
    send: 'Hantar',
    cancel: 'Batal',
    sending: 'Menghantar',
  },
  cancel: {
    titlePoster: 'Batalkan ganjaran ini?',
    titleHelper: 'Tarik diri?',
    waiverPoster:
      'Anda sudah memilih {{name}}, jadi batal sekarang dikira sebagai mungkir janji. Anda ada 1 pengecualian dalam 60 hari; ia akan digunakan dan tiada rekod.',
    countedPoster:
      'Anda sudah memilih {{name}}, jadi batal sekarang direkodkan sebagai mungkir janji (pengecualian 60 hari sudah digunakan; kembali pada {{date}}).',
    waiverHelper:
      '{{name}} sudah memilih anda, jadi tarik diri sekarang dikira sebagai mungkir janji. Anda ada 1 pengecualian dalam 60 hari; ia akan digunakan dan tiada rekod.',
    countedHelper:
      '{{name}} sudah memilih anda, jadi tarik diri sekarang direkodkan sebagai mungkir janji (pengecualian 60 hari sudah digunakan; kembali pada {{date}}).',
    countedPosterUndated:
      'Anda sudah memilih {{name}}, jadi batal sekarang direkodkan sebagai mungkir janji (pengecualian 60 hari sudah digunakan).',
    countedHelperUndated:
      '{{name}} sudah memilih anda, jadi tarik diri sekarang direkodkan sebagai mungkir janji (pengecualian 60 hari sudah digunakan).',
    otherLate:
      '{{name}} sudah lewat 30 minit dan belum bertolak. Jika anda batal sekarang, ia dikira atas {{name}}, bukan anda.',
    confirmPoster: 'Batalkan Ganjaran',
    confirmHelper: 'Tarik Diri',
    keepPoster: 'Jangan Batal',
    keepHelper: 'Terus Membantu',
    checking: 'Menyemak kesan pembatalan',
    sending: 'Membatalkan',
  },
  close: {
    menu: 'Tutup Ganjaran',
    title: 'Tutup ganjaran ini?',
    free_one:
      'Ia akan ditarik dari papan dan peluang percuma bulan ini dipulangkan. {{count}} pemohon akan nampak ia ditutup.',
    free_other:
      'Ia akan ditarik dari papan dan peluang percuma bulan ini dipulangkan. {{count}} pemohon akan nampak ia ditutup.',
    coin_one:
      'Ia akan ditarik dari papan dan 1 syiling anda dipulangkan. {{count}} pemohon akan nampak ia ditutup.',
    coin_other:
      'Ia akan ditarik dari papan dan 1 syiling anda dipulangkan. {{count}} pemohon akan nampak ia ditutup.',
    freeNone: 'Ia akan ditarik dari papan dan peluang percuma bulan ini dipulangkan.',
    coinNone: 'Ia akan ditarik dari papan dan 1 syiling anda dipulangkan.',
    confirm: 'Tutup Ganjaran',
    keep: 'Jangan Tutup',
    sending: 'Menutup',
  },
  confirm: {
    title: 'Sahkan {{name}} sudah siap?',
    body: 'Selepas disahkan, anda tidak boleh laporkan masalah lagi. Seterusnya, bayar {{name}} {{amount}}.',
    confirm: 'Sahkan Siap',
    cancel: 'Belum Lagi',
    sending: 'Mengesahkan',
  },
  live: {
    poster: {
      open: 'Menunggu pemohon',
      applicants_one: '{{count}} pemohon, pilih sekarang',
      applicants_other: '{{count}} pemohon, pilih sekarang',
      assigned: '{{name}} ambil · bertolak sebelum {{time}}',
      late: '{{name}} belum bertolak',
      enRoute: '{{name}} dalam perjalanan · tiba {{time}}',
      done: '{{name}} kata sudah siap · sahkan',
      disputed: 'Menunggu {{name}} selesaikan',
      expiredFree: 'Tamat tempoh · peluang percuma dipulangkan',
      expiredCoin: 'Tamat tempoh · syiling dipulangkan',
    },
    helper: {
      assigned: '{{name}} memilih anda · bertolak sebelum {{time}}',
      late: 'Masa untuk bertolak',
      enRoute: 'Dalam perjalanan · ketik Siap bila sampai',
      done: 'Menunggu {{name}} · sah automatik {{date}}',
      disputed: '{{name}} laporkan masalah',
    },
    applicant: {
      waiting: 'Menunggu {{name}} memilih',
      notSelected: 'Tidak dipilih kali ini',
    },
    action: {
      choose: 'Pilih',
      start: 'Bertolak',
      confirm: 'Sahkan',
      handle: 'Selesaikan',
      view: 'Lihat',
    },
  },
};

export default ms;

import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  title: 'Payment Methods',
  meRow: 'Payment Methods',
  meRowDue: 'A QR code needs checking',
  privacy:
    'Only a poster who picked you sees these, during payment, and they’re hidden once settled.',
  emptyTitle: 'No payment methods yet',
  emptyBody: 'Add one so posters know how to pay you.',
  add: 'Add Payment Method',
  default: 'Default',
  makeDefault: 'Make Default',
  delete: 'Delete',
  cancel: 'Cancel',
  deleteConfirm: {
    title: 'Delete this payment method?',
    body: 'Posters won’t see it when they pay you.',
  },
  loading: 'Loading',
  loadFailed: {
    title: 'Couldn’t load payment methods',
    body: 'Check your connection and try again.',
  },
  retry: 'Try Again',
  actionFailed: 'That didn’t work. Check your connection and try again.',
  menuOther: 'Other',
  deleteMethod: 'Delete Payment Method',
  close: 'Close',
  save: 'Save',
  types: {
    duitnow_id: 'DuitNow Phone Number',
    bank_account: 'Bank Account',
    duitnow_qr: '{{bank}} QR Code',
    duitnow_qr_generic: 'DuitNow QR Code',
    alipay: 'Alipay Receive Code',
    wechat: 'WeChat Receive Code',
    tng: 'TNG QR Code',
    cash: 'Cash in Person',
  },
  detail: {
    joined: '{{first}} · {{second}}',
    business: 'Business QR',
    alipay: 'Recognised',
    wechat: 'Recognised',
  },
  cash: {
    header: 'In Person',
    toggle: 'Accept cash in person',
  },
  recheck: {
    title: 'Your {{method}} hasn’t been checked in 90 days',
    body: 'Pick the screenshot again so payments still reach you.',
    action: 'Pick Again',
  },
  form: {
    phoneLabel: 'Phone',
    phonePlaceholder: '012-345 6789',
    nameLabel: 'Name your bank shows',
    namePlaceholder: 'As in your bank app',
    nameFooter:
      'Posters’ banks show this name when they transfer. If it doesn’t match, they won’t pay.',
    bankLabel: 'Bank',
    bankPlaceholder: 'Choose Bank',
    otherBank: 'Other Bank',
    bankNameLabel: 'Bank name',
    bankNamePlaceholder: 'e.g. Bank Rakyat',
    accountLabel: 'Account number',
    accountFooter: 'Digits only. Only the last 4 digits are shown after saving.',
    error: {
      phoneEmpty: 'Enter a phone number.',
      phoneInvalid: 'Enter a Malaysian mobile number, e.g. 012-345 6789.',
      nameEmpty: 'Enter the name your bank shows.',
      nameInvalid: 'Use 60 characters or fewer.',
      bankEmpty: 'Choose a bank.',
      bankNameEmpty: 'Enter the bank name.',
      bankNameInvalid: 'Use 60 characters or fewer for the bank name.',
      accountEmpty: 'Enter an account number.',
      accountInvalid: 'Account numbers are 6 to 20 digits.',
      saveFailed: 'Couldn’t save. Try again.',
    },
  },
  qr: {
    title: 'QR Code',
    hint: 'In your bank or TNG app, open Receive / Share QR → save to Photos, then pick it here.',
    pick: 'Choose Screenshot',
    scan: 'Scan with Camera',
    footer: 'Choosing from Photos needs no permission. Camera access is asked only when you scan.',
    typeLabel: 'Type',
    payeeLabel: 'Payee',
    typeDuitNow: 'DuitNow · {{bank}}',
    typeBusiness: 'DuitNow · {{bank}} · Business',
    seen: 'Posters will see: {{name}} · {{bank}}',
    seenWallet: 'Posters will see: {{method}}',
    note: 'Posters see this name and bank when they pay. Only the code’s content is saved, never the image.',
    walletNote:
      'Tapiro can’t check Alipay and WeChat codes. Make sure this is your own receive code. Only the code’s content is saved, never the image.',
    retry: 'Choose Another',
    nameLabel: { alipay: 'Name Alipay shows', wechat: 'Name WeChat shows' },
    namePlaceholder: { alipay: 'As in Alipay', wechat: 'As in WeChat' },
    nameFooter: {
      alipay: 'Alipay shows your real name when someone pays. Posters use it to check.',
      wechat: 'WeChat shows your real name when someone pays. Posters use it to check.',
    },
    nameError: {
      empty: 'Enter the name {{wallet}} shows.',
      invalid: 'Use 60 characters or fewer.',
    },
    steps: {
      alipay:
        '1. Open Alipay → Receive (收钱) on the home screen\n2. Tap Save Image\n3. Come back and choose that image below',
      wechat:
        '1. Open WeChat → Me → Services → Money → Receive Money\n2. Tap Save Money Code\n3. Come back and choose that image below',
      tng: '1. Open TNG eWallet → Receive\n2. Save the QR image to Photos\n3. Come back and choose that image below',
    },
    wallet: { alipay: 'Alipay', wechat: 'WeChat' },
    mismatch: 'This is a {{wallet}} code. Save it as {{method}}?',
    error: {
      noCode: { title: 'No QR code found', body: 'Crop closer and try again.' },
      payingCode: {
        title: 'This is a payment code, not a receive code.',
        body: 'Anyone with a payment code can charge you, so it was blocked and not saved. Open Receive in Alipay, WeChat, TNG or your bank app and take a screenshot of that (DuitNow payment codes don’t work either).',
      },
      merchantOrder: {
        title: 'This is a merchant order code, not a receive code',
        body: 'These codes expire in 2 hours. In WeChat, open Money → Receive Money and save your receive code.',
      },
      badCrc: {
        title: 'This code is damaged',
        body: 'Its content doesn’t check out, maybe from compression or cropping. Save it again from your bank app.',
      },
      dynamic: {
        title: 'This code has an amount and expires in 60 seconds',
        body: 'Save a receive code without an amount from your bank app.',
      },
      hasAmount: {
        title: 'This code has a fixed amount',
        body: 'Each payment is different. Save a receive code without an amount.',
      },
      unknown: {
        title: 'Code not recognised',
        body: 'Only DuitNow / TNG QR codes and Alipay and WeChat receive codes are supported.',
      },
      denied: {
        title: 'No camera access',
        body: 'Turn on camera access for Tapiro in Settings, or choose a screenshot instead.',
      },
      unavailable: {
        title: 'Scanning isn’t available on this device',
        body: 'Choose a screenshot instead.',
      },
      failed: { title: 'Couldn’t read that image', body: 'Choose it again.' },
    },
  },
};

export default en;

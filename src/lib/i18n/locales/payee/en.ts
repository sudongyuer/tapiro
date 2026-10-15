import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  title: 'Payment Methods',
  meRow: 'Payment Methods',
  meRowDue: 'A QR code needs checking',
  privacy:
    'Only a poster who picked you sees these, during payment, and they’re hidden once settled.',
  emptyTitle: 'No payment methods yet',
  emptyBody:
    'Add one so posters know how to pay you. DuitNow phone number is best: it doesn’t expire and survives a bank change.',
  add: 'Add Payment Method',
  default: 'Default',
  makeDefault: 'Make Default',
  delete: 'Delete',
  deleteMethod: 'Delete Payment Method',
  close: 'Close',
  save: 'Save',
  types: {
    duitnow_id: 'DuitNow Phone Number',
    bank_account: 'Bank Account',
    qr: 'QR Code (from Photos)',
    duitnow_qr: '{{bank}} QR Code',
    duitnow_qr_generic: 'DuitNow QR Code',
    alipay: 'Alipay Receive Code',
    wechat: 'WeChat Receive Code',
    cash: 'Cash in Person',
  },
  detail: {
    joined: '{{first}} · {{second}}',
    business: 'Business QR',
    alipay: 'Recognised · for posters who use Alipay',
    wechat: 'Recognised · for posters who use WeChat',
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
    accountLabel: 'Account number',
    accountFooter: 'Digits only. Only the last 4 digits are shown after saving.',
    error: {
      phoneEmpty: 'Enter a phone number.',
      phoneInvalid: 'Enter a Malaysian mobile number, e.g. 012-345 6789.',
      nameEmpty: 'Enter the name your bank shows.',
      nameInvalid: 'Use 60 characters or fewer.',
      bankEmpty: 'Choose a bank.',
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
    error: {
      noCode: { title: 'No QR code found', body: 'Crop closer and try again.' },
      payingCode: {
        title: 'This is a payment code, not a receive code.',
        body: 'Anyone with a payment code can charge you, so it was blocked and not saved. Open Receive in Alipay or WeChat and take a screenshot of that.',
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

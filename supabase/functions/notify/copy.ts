export const LANGUAGES = ['zh-Hans', 'en', 'ms'] as const;
export type Language = (typeof LANGUAGES)[number];

export type CopyInput = { actorName: string | null; subject: Record<string, string | undefined> };

type Subject = 'bounty' | 'ride' | 'payment' | 'chat';
type Lines = Record<Language, string>;
type Entry = { subject: Subject; body: Lines };

const SOMEONE: Lines = { 'zh-Hans': '有人', en: 'Someone', ms: 'Seseorang' };
const FALLBACK_TITLE: Record<Subject, Lines> = {
  bounty: { 'zh-Hans': '悬赏', en: 'Bounty', ms: 'Ganjaran' },
  ride: { 'zh-Hans': '拼车', en: 'Ride', ms: 'Tumpangan' },
  payment: { 'zh-Hans': '付款', en: 'Payment', ms: 'Bayaran' },
  chat: { 'zh-Hans': '消息', en: 'Message', ms: 'Mesej' },
};

const COPY: Record<string, Entry> = {
  'bounty.applied': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}申请了你的悬赏',
      en: '{name} applied to your bounty',
      ms: '{name} memohon ganjaran anda',
    },
  },
  'bounty.selected': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}选了你来帮忙',
      en: '{name} chose you to help',
      ms: '{name} memilih anda untuk membantu',
    },
  },
  'bounty.started': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}出发了',
      en: '{name} is on the way',
      ms: '{name} sedang dalam perjalanan',
    },
  },
  'bounty.eta_changed': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}更新了预计到达时间',
      en: '{name} updated the arrival time',
      ms: '{name} mengemas kini masa tiba',
    },
  },
  'bounty.completed': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}点了完成，去确认一下',
      en: '{name} marked it done. Please confirm',
      ms: '{name} menandakannya selesai. Sila sahkan',
    },
  },
  'bounty.issue': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}反馈了问题',
      en: '{name} reported a problem',
      ms: '{name} melaporkan masalah',
    },
  },
  'bounty.cancelled': {
    subject: 'bounty',
    body: {
      'zh-Hans': '{name}取消了这个悬赏',
      en: '{name} cancelled this bounty',
      ms: '{name} membatalkan ganjaran ini',
    },
  },
  'ride.requested': {
    subject: 'ride',
    body: {
      'zh-Hans': '{name}想加入你的拼车',
      en: '{name} wants to join your ride',
      ms: '{name} ingin menyertai tumpangan anda',
    },
  },
  'ride.approved': {
    subject: 'ride',
    body: {
      'zh-Hans': '{name}同意了你的拼车申请',
      en: '{name} approved your request',
      ms: '{name} meluluskan permintaan anda',
    },
  },
  'ride.declined': {
    subject: 'ride',
    body: {
      'zh-Hans': '这次拼车没能带上你',
      en: "This ride couldn't take you",
      ms: 'Tumpangan ini tidak dapat menerima anda',
    },
  },
  'ride.cancelled': {
    subject: 'ride',
    body: {
      'zh-Hans': '{name}取消了拼车',
      en: '{name} cancelled the ride',
      ms: '{name} membatalkan tumpangan',
    },
  },
  'ride.time_revised': {
    subject: 'ride',
    body: {
      'zh-Hans': '出发时间改了',
      en: 'The departure time changed',
      ms: 'Masa bertolak telah berubah',
    },
  },
  'ride.no_show': {
    subject: 'ride',
    body: {
      'zh-Hans': '你被标记为没上车，有误可以申诉',
      en: 'You were marked as not on board. Appeal if this is wrong',
      ms: 'Anda ditanda tidak menaiki kenderaan. Rayu jika ini salah',
    },
  },
  'ride.appealed': {
    subject: 'ride',
    body: {
      'zh-Hans': '{name}说自己上车了，去确认一下',
      en: '{name} says they were on board. Please check',
      ms: '{name} kata mereka ada dalam kenderaan. Sila semak',
    },
  },
  'ride.split_sent': {
    subject: 'ride',
    body: {
      'zh-Hans': '车费分好了，看看你的那份',
      en: 'The fare is split. See your share',
      ms: 'Tambang telah dibahagi. Lihat bahagian anda',
    },
  },
  'ride.share_disputed': {
    subject: 'ride',
    body: {
      'zh-Hans': '{name}觉得金额不对',
      en: '{name} says their share is wrong',
      ms: '{name} kata bahagian mereka salah',
    },
  },
  'ride.share_changed': {
    subject: 'ride',
    body: {
      'zh-Hans': '你的车费改了',
      en: 'Your share changed',
      ms: 'Bahagian anda telah berubah',
    },
  },
  'payment.marked_paid': {
    subject: 'payment',
    body: {
      'zh-Hans': '{name}说已付款，收到了吗？',
      en: '{name} says they paid. Did you receive it?',
      ms: '{name} kata mereka telah membayar. Sudah terima?',
    },
  },
  'payment.not_received': {
    subject: 'payment',
    body: {
      'zh-Hans': '{name}还没收到款',
      en: "{name} hasn't received the payment yet",
      ms: '{name} belum menerima bayaran',
    },
  },
  'chat.message': {
    subject: 'chat',
    body: {
      'zh-Hans': '{name}发来一条消息',
      en: '{name} sent you a message',
      ms: '{name} menghantar mesej kepada anda',
    },
  },
};

const HAN = '\\p{Script=Han}';
const LATIN_THEN_HAN = new RegExp(`([A-Za-z])(?=${HAN})`, 'gu');
const HAN_THEN_LATIN = new RegExp(`(${HAN})(?=[A-Za-z])`, 'gu');

// A port of src/lib/i18n/latinSpacing.ts, which Deno cannot import; copy.test.ts compares the two.
export function latinSpacing(value: string, language: Language) {
  if (!language.startsWith('zh')) return value;
  return value.replace(LATIN_THEN_HAN, '$1 ').replace(HAN_THEN_LATIN, '$1 ');
}

export const COPY_KINDS = Object.keys(COPY);

export function toLanguage(value: string): Language {
  return (LANGUAGES as readonly string[]).includes(value) ? (value as Language) : 'zh-Hans';
}

function titleOf(entry: Entry, language: Language, subject: CopyInput['subject']) {
  const route = subject.from && subject.to ? `${subject.from} → ${subject.to}` : null;
  if (entry.subject === 'ride') return route ?? FALLBACK_TITLE.ride[language];
  if (entry.subject === 'chat') return subject.title || route || FALLBACK_TITLE.chat[language];
  return subject.title || FALLBACK_TITLE[entry.subject][language];
}

export function pushCopy(kind: string, language: Language, input: CopyInput) {
  const entry = COPY[kind];
  if (!entry) return null;
  const name = input.actorName?.trim() || SOMEONE[language];
  return {
    title: titleOf(entry, language, input.subject),
    body: latinSpacing(entry.body[language].replace('{name}', name), language),
  };
}

export function localizedCopy(kind: string, storedLanguage: string, input: CopyInput) {
  const language = toLanguage(storedLanguage);
  const copy = pushCopy(kind, language, input);
  return copy && { language, ...copy };
}

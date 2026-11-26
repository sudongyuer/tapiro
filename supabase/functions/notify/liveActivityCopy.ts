import { LANGUAGES, type Language } from './copy.ts';

type Lines = {
  unit: string;
  stale: string;
  homeStart: string;
  pair: string;
  bounty: {
    onTheWay_one: string;
    onTheWay_other: string;
    onTheWayStale: string;
    left: string;
    eta: string;
    arrived: string;
    arrivedPlain: string;
    arrivedDetail: string;
    arrivedAt: string;
  };
  ride: {
    meetup: string;
    leaving_one: string;
    leaving_other: string;
    gatherAt: string;
    departAt: string;
    departed: string;
    aboard_one: string;
    aboard_other: string;
    departedAt: string;
  };
};

// The same strings as src/lib/i18n/locales/liveActivity, which this function cannot import; a Bun test compares them.
export const LIVE_ACTIVITY_COPY: Record<Language, Lines> = {
  'zh-Hans': {
    unit: '分',
    stale: '可能不是最新',
    homeStart: '出发点',
    pair: '{{first}} · {{second}}',
    bounty: {
      onTheWay_one: '{{name}} · 约 {{count}} 分钟到',
      onTheWay_other: '{{name}} · 约 {{count}} 分钟到',
      onTheWayStale: '{{name}} · 在路上',
      left: '出发 {{time}}',
      eta: '约 {{time}} 到',
      arrived: '{{name}}到了 · {{place}}',
      arrivedPlain: '{{name}}到了',
      arrivedDetail: '去碰面吧',
      arrivedAt: '{{time}} 到了',
    },
    ride: {
      meetup: '集合 · {{place}}',
      leaving_one: '{{count}} 分钟后出发 · {{arrived}}/{{total}} 到了',
      leaving_other: '{{count}} 分钟后出发 · {{arrived}}/{{total}} 到了',
      gatherAt: '集合 {{time}}',
      departAt: '{{time}} 出发',
      departed: '出发了 · {{place}}',
      aboard_one: '{{count}} 人上车',
      aboard_other: '{{count}} 人上车',
      departedAt: '{{time}} 出发了',
    },
  },
  en: {
    unit: 'min',
    stale: 'May not be up to date',
    homeStart: 'Pickup point',
    pair: '{{first}} · {{second}}',
    bounty: {
      onTheWay_one: '{{name}} · about {{count}} min away',
      onTheWay_other: '{{name}} · about {{count}} min away',
      onTheWayStale: '{{name}} · on the way',
      left: 'Left {{time}}',
      eta: 'Arrives ~{{time}}',
      arrived: '{{name}} is here · {{place}}',
      arrivedPlain: '{{name}} is here',
      arrivedDetail: 'Go meet them',
      arrivedAt: 'Arrived {{time}}',
    },
    ride: {
      meetup: 'Meet up · {{place}}',
      leaving_one: 'Leaves in {{count}} min · {{arrived}}/{{total}} here',
      leaving_other: 'Leaves in {{count}} min · {{arrived}}/{{total}} here',
      gatherAt: 'Meet {{time}}',
      departAt: 'Leaves {{time}}',
      departed: 'On the way · {{place}}',
      aboard_one: '{{count}} rider on board',
      aboard_other: '{{count}} riders on board',
      departedAt: 'Left {{time}}',
    },
  },
  ms: {
    unit: 'min',
    stale: 'Mungkin tidak terkini',
    homeStart: 'Tempat bertolak',
    pair: '{{first}} · {{second}}',
    bounty: {
      onTheWay_one: '{{name}} · lebih kurang {{count}} minit lagi',
      onTheWay_other: '{{name}} · lebih kurang {{count}} minit lagi',
      onTheWayStale: '{{name}} · dalam perjalanan',
      left: 'Bertolak {{time}}',
      eta: 'Tiba ~{{time}}',
      arrived: '{{name}} sudah sampai · {{place}}',
      arrivedPlain: '{{name}} sudah sampai',
      arrivedDetail: 'Pergi jumpa dia',
      arrivedAt: 'Sampai {{time}}',
    },
    ride: {
      meetup: 'Berkumpul · {{place}}',
      leaving_one: 'Bertolak dalam {{count}} minit · {{arrived}}/{{total}} sudah sampai',
      leaving_other: 'Bertolak dalam {{count}} minit · {{arrived}}/{{total}} sudah sampai',
      gatherAt: 'Berkumpul {{time}}',
      departAt: 'Bertolak {{time}}',
      departed: 'Sudah bertolak · {{place}}',
      aboard_one: '{{count}} orang dalam kereta',
      aboard_other: '{{count}} orang dalam kereta',
      departedAt: 'Bertolak {{time}}',
    },
  },
};

type Vars = Record<string, string | number>;
type Plural = 'onTheWay' | 'leaving' | 'aboard';

const HAN = '\\p{Script=Han}';
const LATIN_THEN_HAN = new RegExp(`([A-Za-z])(?=${HAN})`, 'gu');
const HAN_THEN_LATIN = new RegExp(`(${HAN})(?=[A-Za-z])`, 'gu');

// Mirrors the app's i18next post-processors (sentenceStart, latinSpacing) so both sides draw the same line.
function render(language: Language, template: string, vars: Vars) {
  let value = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''));
  if (template.startsWith('{{')) value = value.charAt(0).toUpperCase() + value.slice(1);
  if (language === 'zh-Hans') {
    value = value.replace(LATIN_THEN_HAN, '$1 ').replace(HAN_THEN_LATIN, '$1 ');
  }
  return value;
}

export type LiveActivityCopy = {
  language: Language;
  line(path: string, vars?: Vars): string;
};

function lookup(lines: Lines, path: string): string {
  let node: unknown = lines;
  for (const part of path.split('.')) node = (node as Record<string, unknown>)?.[part];
  if (typeof node !== 'string') throw new Error(`live activity copy ${path}`);
  return node;
}

export function liveActivityCopy(stored: string): LiveActivityCopy {
  const language: Language = (LANGUAGES as readonly string[]).includes(stored)
    ? (stored as Language)
    : 'zh-Hans';
  const lines = LIVE_ACTIVITY_COPY[language];
  const plurals = new Intl.PluralRules(language);
  return {
    language,
    line(path, vars = {}) {
      const base = path.split('.').pop() as Plural | string;
      const plural =
        ['onTheWay', 'leaving', 'aboard'].includes(base) && typeof vars.count === 'number';
      const key = plural
        ? `${path}_${plurals.select(vars.count as number) === 'one' ? 'one' : 'other'}`
        : path;
      return render(language, lookup(lines, key), vars);
    },
  };
}

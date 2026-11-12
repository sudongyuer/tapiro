import type { CloudAnswer, CloudRequest } from './cloudGate';

export const FIXTURE_REPLIES = [
  'answer',
  'clarify',
  'draft',
  'draftFull',
  'draftDropped',
  'pick',
  'providerError',
  'hungry',
  'busy',
  'offline',
  'consentRequired',
  'malformed',
  'silence',
] as const;
export type FixtureReply = (typeof FIXTURE_REPLIES)[number];

export function fixtureReplies(value: string | undefined): FixtureReply[] {
  const replies = (value ?? '')
    .split(',')
    .filter((reply): reply is FixtureReply => FIXTURE_REPLIES.includes(reply as FixtureReply));
  return replies.length > 0 ? replies : ['answer'];
}

const pad = (value: number) => String(value).padStart(2, '0');

function localIso(date: Date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = pad(Math.floor(Math.abs(offset) / 60));
  const minutes = pad(Math.abs(offset) % 60);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${hours}:${minutes}`;
}

function daysAhead(now: Date, days: number, hours: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return localIso(date);
}

const EMPTY = {
  category: null,
  rewardMajor: null,
  currency: null,
  description: null,
  deadlineAt: null,
  startsAt: null,
  endsAt: null,
  placeHint: null,
};

export const FIXTURE_TRANSCRIPTS: Readonly<Record<string, string>> = {
  'zh-Hans': '明天帮我去 Pyramid 取快递',
  en: 'Pick up my parcel at Pyramid tomorrow',
  ms: 'Tolong ambil bungkusan saya di Pyramid esok',
};

// A recording is always written down; only a refusal or 'silence' in the queue changes what comes back.
function body(reply: FixtureReply, now: Date, request: CloudRequest): unknown {
  if (request.task === 'transcribe') {
    const text = reply === 'silence' ? '' : (FIXTURE_TRANSCRIPTS[request.input.language] ?? '');
    return { tool: 'transcript', result: { text } };
  }
  switch (reply) {
    case 'answer':
      return {
        tool: 'answer',
        result: {
          text: '靠谱度按近 180 天算。帮不同的人完成任务、收到「开心」评价、按时付款，这三件事最有用。',
        },
      };
    case 'clarify':
      return {
        tool: 'clarify',
        result: { question: '什么时候要？', choices: ['今天下午', '今晚', '明天'] },
      };
    case 'draft':
      return {
        tool: 'draft_bounty',
        result: {
          ...EMPTY,
          title: '帮取快递',
          category: 'pickup',
          rewardMajor: 15,
          deadlineAt: daysAhead(now, 1, 18),
        },
      };
    case 'draftFull':
      return {
        tool: 'draft_bounty',
        result: {
          title: '帮我去 Sunway Pyramid 取两个快递，送到 Sunway Geo 大堂，顺路买杯少冰奶茶',
          category: 'pickup',
          rewardMajor: 15,
          currency: 'MYR',
          description:
            '两个快递在 Sunway Pyramid 北门的快递柜，取件码到时候发你。一个是书，有点重；另一个是衣服。送到 Sunway Geo 大堂交给保安或者打电话给我下楼拿都可以。顺路在一楼买杯少冰的奶茶，钱另外转你。',
          deadlineAt: null,
          startsAt: daysAhead(now, 1, 15),
          endsAt: daysAhead(now, 1, 17),
          placeHint: 'Sunway Pyramid 北门快递柜',
        },
      };
    case 'draftDropped':
      return {
        tool: 'draft_bounty',
        result: {
          ...EMPTY,
          title: '帮搬两个箱子上三楼',
          category: 'move',
          rewardMajor: 600,
          currency: 'MYR',
          deadlineAt: daysAhead(now, 40, 10),
        },
      };
    case 'pick':
      return {
        tool: 'pick',
        result: {
          items: [
            {
              summary: '明天帮搬家具 · RM 50',
              draft: { ...EMPTY, title: '明天帮搬家具', category: 'move', rewardMajor: 50 },
            },
            {
              summary: '帮取快递',
              draft: { ...EMPTY, title: '帮取快递', category: 'pickup', rewardMajor: 8 },
            },
          ],
        },
      };
    case 'malformed':
      return { tool: 'answer', result: {} };
    default:
      return null;
  }
}

const REFUSALS: Partial<Record<FixtureReply, CloudAnswer>> = {
  providerError: { ok: false, error: 'provider_error', status: 502 },
  hungry: { ok: false, error: 'hungry', status: 429 },
  busy: { ok: false, error: 'busy', status: 409 },
  offline: { ok: false, error: null, status: null },
  consentRequired: { ok: false, error: 'consent_required', status: 403 },
};

export function createFixtureSender({
  replies,
  delayMs,
  now = () => new Date(),
  onCall,
  onConsentRequired,
  meter = () => ({}),
  onHungry = () => undefined,
}: {
  replies: FixtureReply[];
  delayMs: number;
  now?: () => Date;
  onCall: (name: string, args: unknown) => void;
  onConsentRequired: () => void;
  meter?: () => object | null;
  onHungry?: () => void;
}) {
  const queue = [...replies];
  return async function send(request: CloudRequest): Promise<CloudAnswer> {
    onCall(
      request.task,
      request.task === 'transcribe'
        ? { language: request.input.language, audio: request.input.audio.data !== '' }
        : { text: request.input.text, image: request.input.image !== undefined },
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    if (reply === 'consentRequired') onConsentRequired();
    if (reply === 'hungry') onHungry();
    const refused = REFUSALS[reply];
    if (refused) return refused;
    const spent = meter();
    if (spent === null) return REFUSALS.hungry!;
    return {
      ok: true,
      body: { task: request.task, ...(body(reply, now(), request) as object), ...spent },
    };
  };
}

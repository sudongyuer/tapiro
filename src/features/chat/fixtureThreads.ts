import type { FixtureVariant } from '@/lib/fixtureVariant';

import { MESSAGE_MAX, type ChatMember, type ChatMessage, type ThreadInfo } from './types';

export const FIXTURE_CHAT_USER_ID = '00000000-0000-4000-8000-000000000001';

export type FixtureThread = ThreadInfo & { messages: ChatMessage[] };

const MINUTE_MS = 60_000;

const member = (id: string, name: string | null, left = false): ChatMember => ({
  id,
  name,
  avatarUrl: null,
  left,
});

const JIE = member('fixture-chat-jie', '阿杰');
const MEI = member('fixture-chat-mei', '美玲');
const ARIF = member('fixture-chat-arif', 'Arif');
const WORST_NAME = 'Nurul Aisyah binti Mohd Rahman Abdullah Hj. Kamaruddin';
const WORST = member('fixture-chat-worst', WORST_NAME);

type Line = { from: string; body: string; minutesAgo: number };

function thread(
  id: string,
  kind: ThreadInfo['kind'],
  members: ChatMember[],
  lines: readonly Line[],
  now: Date,
  read: { mine: number | null; peer: number | null },
): FixtureThread {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE_MS).toISOString();
  const messages = lines
    .map((line, index): ChatMessage => ({
      id: `${id}-m${index + 1}`,
      threadId: id,
      senderId: line.from,
      clientId: `${id}-c${index + 1}`,
      body: line.body,
      createdAt: at(line.minutesAgo),
    }))
    .reverse();
  const oldest = lines[0]?.minutesAgo ?? 30;
  return {
    id,
    kind,
    itemId: `${id}-item`,
    createdAt: at(oldest + 5),
    left: false,
    unread: false,
    lastReadAt: read.mine === null ? null : at(read.mine),
    peerReadAt: kind === 'bounty' && read.peer !== null ? at(read.peer) : null,
    members,
    messages,
  };
}

const ME = FIXTURE_CHAT_USER_ID;

function demoThreads(now: Date): FixtureThread[] {
  return [
    thread(
      'fixture-chat-bounty',
      'bounty',
      [JIE],
      [
        { from: JIE.id, body: '我到楼下了，快递放哪里？', minutesAgo: 12 },
        { from: ME, body: '放门口的鞋柜上就好，谢谢！', minutesAgo: 10 },
        { from: JIE.id, body: '好的，放好了，拍了照片给你', minutesAgo: 2 },
      ],
      now,
      { mine: 10, peer: 10 },
    ),
    thread(
      'fixture-chat-ride',
      'ride',
      [MEI, ARIF],
      [
        { from: MEI.id, body: '我们在 Sunway Geo 门口集合吧', minutesAgo: 90 },
        { from: ARIF.id, body: 'OK, saya sampai 10 minit lagi', minutesAgo: 80 },
        { from: ME, body: '收到，我穿蓝色外套', minutesAgo: 75 },
      ],
      now,
      { mine: 75, peer: null },
    ),
    thread('fixture-chat-new', 'bounty', [member('fixture-chat-lin', '小林')], [], now, {
      mine: null,
      peer: null,
    }),
  ];
}

function worstThreads(now: Date): FixtureThread[] {
  const long = '这条消息很长，'.repeat(400).slice(0, MESSAGE_MAX);
  const head = thread(
    'fixture-chat-worst',
    'bounty',
    [WORST],
    [
      { from: WORST.id, body: long, minutesAgo: 3 },
      { from: ME, body: long, minutesAgo: 1 },
    ],
    now,
    { mine: 3, peer: 1 },
  );
  const crowd = Array.from({ length: 60 }, (_, index) =>
    thread(
      `fixture-chat-worst-${index + 1}`,
      index % 2 === 0 ? 'bounty' : 'ride',
      index % 2 === 0 ? [member(`fixture-chat-p${index}`, null)] : [WORST, JIE, MEI, ARIF],
      [{ from: WORST.id, body: `${WORST_NAME} 🚗📦 ${index + 1}`, minutesAgo: 10 + index * 7 }],
      now,
      { mine: index % 3 === 0 ? null : 10 + index * 7, peer: null },
    ),
  );
  return [head, ...crowd];
}

export const LONG_THREAD_ID = 'fixture-chat-long';

const LONG_LINES = [
  '你好，我是接你悬赏的阿杰',
  '你好！谢谢你接单',
  '快递是在 Sunway Pyramid 的驿站吗？',
  '对，LG 层，靠近 Uniqlo 那边',
  '好的，取件码发我一下',
  '8-2-4417',
  '收到 👍',
  '大概几点能到？我五点有课',
  '我现在在路上，Grab 说 15 分钟',
  'OK 不急，路上小心',
  '到驿站了，排队的人有点多',
  '没事慢慢来',
  '拿到了，是一个中等大小的箱子，有点重，你要我直接送到楼上还是放保安亭？',
  '送上来吧，Block C 12 楼，我在家',
  '电梯要刷卡吗？',
  '要的，我下来接你',
  '好，我到楼下给你发消息',
  'Thanks ya',
  '🙏',
  '到了，在大堂',
  '马上下来',
  '看到你了',
] as const;

function longThread(now: Date): FixtureThread {
  const lines: Line[] = Array.from({ length: 44 }, (_, index) => ({
    from: index % 3 === 1 ? ME : JIE.id,
    body: LONG_LINES[index % LONG_LINES.length],
    minutesAgo: 240 - index * 5,
  }));
  const incoming: Line[] = [
    { from: JIE.id, body: '箱子放你门口了', minutesAgo: -20 / 60 },
    { from: JIE.id, body: '记得确认一下哦', minutesAgo: -40 / 60 },
  ];
  return thread(LONG_THREAD_ID, 'bounty', [JIE], [...lines, ...incoming], now, {
    mine: 40,
    peer: 30,
  });
}

export function fixtureThreads(variant: FixtureVariant, now: Date, long = false): FixtureThread[] {
  const threads = variantThreads(variant, now);
  return long ? [longThread(now), ...threads] : threads;
}

function variantThreads(variant: FixtureVariant, now: Date): FixtureThread[] {
  if (variant === 'empty') return [];
  if (variant === 'one') return demoThreads(now).slice(0, 1);
  if (variant === 'worst') return worstThreads(now);
  return demoThreads(now);
}

export type DuePush = {
  queueId: number;
  kind: string;
  subjectId: string;
  threadId: string;
  actorName: string | null;
  subject: Record<string, string | undefined>;
  tokens: { token: string; language: string }[];
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  threadId: string;
  sound: 'default';
  data: { kind: string; id: string };
};

export type OutgoingPush = { queueId: number; language: string; message: PushMessage };

export type CopyBuilder = (
  kind: string,
  storedLanguage: string,
  input: Pick<DuePush, 'actorName' | 'subject'>,
) => { language: string; title: string; body: string } | null;

export type SendResult = { ok: true } | { ok: false; error: string };

export type PushSender = {
  send(pushes: OutgoingPush[]): Promise<SendResult[]>;
};

export type NotifyDeps = {
  authorized(token: string): boolean;
  claim(maxRows: number): Promise<DuePush[]>;
  finish(queueId: number, error: string | null): Promise<void>;
  dropToken(token: string): Promise<void>;
  copy: CopyBuilder;
  sender: PushSender;
};

const BATCH = 100;
const MAX_ROUNDS = 10;
const NOT_REGISTERED = 'DeviceNotRegistered';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function outgoing(push: DuePush, copyFor: CopyBuilder): OutgoingPush[] | null {
  const pushes: OutgoingPush[] = [];
  for (const { token, language: stored } of push.tokens) {
    const copy = copyFor(push.kind, stored, push);
    if (!copy) return null;
    const { language, title, body } = copy;
    pushes.push({
      queueId: push.queueId,
      language,
      message: {
        to: token,
        title,
        body,
        threadId: push.threadId,
        sound: 'default',
        data: { kind: push.kind, id: push.subjectId },
      },
    });
  }
  return pushes;
}

type Tally = { sent: number; failed: number; unfinished: number };

async function sendChunk(sender: PushSender, pushes: OutgoingPush[]): Promise<SendResult[]> {
  if (pushes.length === 0) return [];
  try {
    const answers = await sender.send(pushes);
    return pushes.map((_, index) => answers[index] ?? { ok: false, error: 'no_ticket' });
  } catch (error) {
    const reason = (error instanceof Error && error.message) || 'send_failed';
    return pushes.map(() => ({ ok: false, error: reason }));
  }
}

function outcomeOf(results: SendResult[]) {
  if (results.some((result) => result.ok)) return null;
  const failure = results.find((result) => !result.ok && result.error !== NOT_REGISTERED);
  return failure && !failure.ok ? failure.error : 'no_device';
}

async function settle(deps: NotifyDeps, tally: Tally, queueId: number, error: string | null) {
  try {
    await deps.finish(queueId, error);
    if (error) tally.failed += 1;
    else tally.sent += 1;
  } catch {
    tally.unfinished += 1;
  }
}

async function dropUnregistered(deps: NotifyDeps, pushes: OutgoingPush[], results: SendResult[]) {
  for (const [index, result] of results.entries()) {
    if (result.ok || result.error !== NOT_REGISTERED) continue;
    try {
      await deps.dropToken(pushes[index].message.to);
    } catch {
      continue;
    }
  }
}

async function flush(deps: NotifyDeps, tally: Tally, chunk: OutgoingPush[][]) {
  const pushes = chunk.flat();
  const results = await sendChunk(deps.sender, pushes);
  await dropUnregistered(deps, pushes, results);
  let offset = 0;
  for (const rowPushes of chunk) {
    const rowResults = results.slice(offset, offset + rowPushes.length);
    offset += rowPushes.length;
    await settle(deps, tally, rowPushes[0].queueId, outcomeOf(rowResults));
  }
}

async function round(deps: NotifyDeps, due: DuePush[], tally: Tally) {
  let chunk: OutgoingPush[][] = [];
  let size = 0;
  for (const push of due) {
    const built = outgoing(push, deps.copy);
    if (built === null) {
      await settle(deps, tally, push.queueId, 'no_copy');
      continue;
    }
    if (built.length === 0) {
      await settle(deps, tally, push.queueId, 'no_device');
      continue;
    }
    if (size + built.length > BATCH && chunk.length > 0) {
      await flush(deps, tally, chunk);
      chunk = [];
      size = 0;
    }
    chunk.push(built);
    size += built.length;
  }
  if (chunk.length > 0) await flush(deps, tally, chunk);
}

export async function handleNotify(req: Request, deps: NotifyDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !deps.authorized(token)) return json(401, { error: 'unauthorized' });

  const tally: Tally = { sent: 0, failed: 0, unfinished: 0 };
  try {
    for (let rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
      const due = await deps.claim(BATCH);
      if (due.length === 0) break;
      await round(deps, due, tally);
      if (due.length < BATCH) break;
    }
  } catch {
    return json(500, { error: 'claim_failed', ...tally });
  }
  return json(tally.unfinished > 0 ? 500 : 200, tally);
}

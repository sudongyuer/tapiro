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

async function sendAll(sender: PushSender, pushes: OutgoingPush[]) {
  const results: SendResult[] = [];
  for (let start = 0; start < pushes.length; start += BATCH) {
    const chunk = pushes.slice(start, start + BATCH);
    try {
      const answers = await sender.send(chunk);
      chunk.forEach((_, index) =>
        results.push(answers[index] ?? { ok: false, error: 'no_ticket' }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'send_failed';
      chunk.forEach(() => results.push({ ok: false, error: reason || 'send_failed' }));
    }
  }
  return results;
}

async function round(deps: NotifyDeps, due: DuePush[]) {
  const pushes: OutgoingPush[] = [];
  const outcome = new Map<number, string | null>();
  for (const push of due) {
    const built = outgoing(push, deps.copy);
    if (built === null) outcome.set(push.queueId, 'no_copy');
    else {
      outcome.set(push.queueId, null);
      pushes.push(...built);
    }
  }

  const results = await sendAll(deps.sender, pushes);
  const delivered = new Set<number>();
  const failure = new Map<number, string>();
  for (const [index, result] of results.entries()) {
    const push = pushes[index];
    if (result.ok) delivered.add(push.queueId);
    else if (result.error === NOT_REGISTERED) await deps.dropToken(push.message.to);
    else if (!failure.has(push.queueId)) failure.set(push.queueId, result.error);
  }

  let sent = 0;
  let failed = 0;
  for (const [queueId, early] of outcome) {
    const error = early ?? (delivered.has(queueId) ? null : (failure.get(queueId) ?? null));
    await deps.finish(queueId, error);
    if (error) failed += 1;
    else sent += 1;
  }
  return { sent, failed };
}

export async function handleNotify(req: Request, deps: NotifyDeps) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !deps.authorized(token)) return json(401, { error: 'unauthorized' });

  let sent = 0;
  let failed = 0;
  try {
    for (let rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
      const due = await deps.claim(BATCH);
      if (due.length === 0) break;
      const result = await round(deps, due);
      sent += result.sent;
      failed += result.failed;
      if (due.length < BATCH) break;
    }
  } catch {
    return json(500, { error: 'notify_failed', sent, failed });
  }
  return json(200, { sent, failed });
}

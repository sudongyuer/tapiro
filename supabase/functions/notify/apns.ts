import {
  UNREGISTERED,
  type ApnsEnvironment,
  type PushMessage,
  type PushSender,
  type SendResult,
} from './handler.ts';

export const APNS_ORIGINS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

export const APP_TOPIC = 'app.tapiro';

// Apple rejects a provider token older than an hour and throttles refreshes more often than every 20 minutes. Each
// isolate signs its own token, so `iat` is pinned to a shared 30-minute window instead of the isolate's start.
const TOKEN_WINDOW_MS = 30 * 60 * 1000;
// BadDeviceToken stays a visible error instead of a drop: for a hex-checked token it means a wrong environment.
const DROPPED_REASONS = new Set(['Unregistered', 'DeviceTokenNotForTopic']);

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  key: CryptoKey;
  topic: string;
  origins: Record<ApnsEnvironment, string>;
  fetch?: typeof fetch;
  now?: () => number;
};

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encodeJson = (value: unknown) => base64url(encoder.encode(JSON.stringify(value)));

export async function importApnsKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
}

export async function signProviderToken(config: ApnsConfig, issuedAtMs: number) {
  const header = encodeJson({ alg: 'ES256', kid: config.keyId });
  const claims = encodeJson({ iss: config.teamId, iat: Math.floor(issuedAtMs / 1000) });
  const input = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    config.key,
    encoder.encode(input),
  );
  return `${input}.${base64url(new Uint8Array(signature))}`;
}

export function apnsPayload(message: PushMessage) {
  return {
    aps: {
      alert: { title: message.title, body: message.body },
      sound: message.sound,
      'thread-id': message.threadId,
    },
    // expo-notifications reads content.data from userInfo.body (AGENTS.md, Platform pitfalls).
    body: message.data,
  };
}

async function reasonOf(response: Response) {
  try {
    const parsed = (await response.json()) as { reason?: unknown };
    return typeof parsed.reason === 'string' ? parsed.reason : 'unknown';
  } catch {
    return 'unknown';
  }
}

export type ApnsRequest = {
  to: string;
  environment: ApnsEnvironment;
  pushType: 'alert' | 'liveactivity';
  priority: 5 | 10;
  payload: unknown;
};

export type LiveActivityPush = Omit<ApnsRequest, 'pushType'>;
export type LiveActivitySender = { send(pushes: LiveActivityPush[]): Promise<SendResult[]> };
export type ApnsSenders = { pushes: PushSender; liveActivities: LiveActivitySender };

export const liveActivityTopic = (appTopic: string) => `${appTopic}.push-type.liveactivity`;

function apnsTransport(config: ApnsConfig) {
  const send = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  let cached: { token: string; issuedAt: number } | null = null;

  async function providerToken() {
    const window = Math.floor(now() / TOKEN_WINDOW_MS) * TOKEN_WINDOW_MS;
    if (cached?.issuedAt !== window) {
      cached = { token: await signProviderToken(config, window), issuedAt: window };
    }
    return cached.token;
  }

  async function deliver(request: ApnsRequest, token: string): Promise<SendResult> {
    let response: Response;
    try {
      response = await send(`${config.origins[request.environment]}/3/device/${request.to}`, {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'apns-topic':
            request.pushType === 'liveactivity' ? liveActivityTopic(config.topic) : config.topic,
          'apns-push-type': request.pushType,
          'apns-priority': String(request.priority),
          'content-type': 'application/json',
        },
        body: JSON.stringify(request.payload),
      });
    } catch {
      return { ok: false, error: 'apns_unreachable' };
    }
    if (response.ok) {
      await response.body?.cancel();
      return { ok: true };
    }
    const reason = await reasonOf(response);
    if (response.status === 410 || DROPPED_REASONS.has(reason)) {
      return { ok: false, error: UNREGISTERED };
    }
    return { ok: false, error: `apns_${response.status}_${reason}` };
  }

  return async (requests: ApnsRequest[]) => {
    if (requests.length === 0) return [];
    const token = await providerToken();
    return Promise.all(requests.map((request) => deliver(request, token)));
  };
}

export function apnsSenders(config: ApnsConfig): ApnsSenders {
  const post = apnsTransport(config);
  return {
    pushes: {
      send: (pushes) =>
        post(
          pushes.map(({ message }) => ({
            to: message.to,
            environment: message.environment,
            pushType: 'alert',
            priority: 10,
            payload: apnsPayload(message),
          })),
        ),
    },
    liveActivities: {
      send: (pushes) => post(pushes.map((push) => ({ ...push, pushType: 'liveactivity' }))),
    },
  };
}

export const apnsSender = (config: ApnsConfig): PushSender => apnsSenders(config).pushes;

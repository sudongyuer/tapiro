import {
  UNREGISTERED,
  type ApnsEnvironment,
  type OutgoingPush,
  type PushMessage,
  type PushSender,
  type SendResult,
} from './handler.ts';

export const APNS_ORIGINS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

export const APP_TOPIC = 'app.tapiro';

// Apple rejects a provider token older than an hour and throttles one refreshed more often than every 20 minutes.
const TOKEN_LIFETIME_MS = 50 * 60 * 1000;
const DROPPED_REASONS = new Set(['Unregistered', 'BadDeviceToken', 'DeviceTokenNotForTopic']);

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

export function apnsSender(config: ApnsConfig): PushSender {
  const send = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  let cached: { token: string; issuedAt: number } | null = null;

  async function providerToken() {
    const at = now();
    if (!cached || at - cached.issuedAt >= TOKEN_LIFETIME_MS) {
      cached = { token: await signProviderToken(config, at), issuedAt: at };
    }
    return cached.token;
  }

  async function deliver({ message }: OutgoingPush, token: string): Promise<SendResult> {
    let response: Response;
    try {
      response = await send(`${config.origins[message.environment]}/3/device/${message.to}`, {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'apns-topic': config.topic,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apnsPayload(message)),
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
    if (reason === 'ExpiredProviderToken' || reason === 'InvalidProviderToken') cached = null;
    return { ok: false, error: `apns_${response.status}_${reason}` };
  }

  return {
    async send(pushes) {
      if (pushes.length === 0) return [];
      const token = await providerToken();
      return Promise.all(pushes.map((push) => deliver(push, token)));
    },
  };
}

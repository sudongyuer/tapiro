import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseChatService, IMAGE_BUCKET } from './chatService';

const IMAGE = { path: 't1/u1/c1.jpg', file: 'c1.jpg', width: 1536, height: 2048 };
const STORED = {
  id: 'm1',
  threadId: 't1',
  senderId: 'u1',
  clientId: 'c1',
  body: '',
  image: { path: IMAGE.path, width: 1536, height: 2048 },
  createdAt: '2026-11-06T01:00:00.123456+00:00',
};

function stub(uploadError: unknown, cached: string | null = null) {
  const calls: string[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push(`rpc ${name} ${JSON.stringify(args)}`);
      return { data: STORED, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _body: ArrayBuffer, options: unknown) => {
          calls.push(`upload ${bucket} ${path} ${JSON.stringify(options)}`);
          return { error: uploadError };
        },
        createSignedUrl: async (path: string) => {
          calls.push(`sign ${bucket} ${path}`);
          return { data: { signedUrl: `https://local/${path}?token=x` }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
  const files = {
    read: async (file: string) => {
      calls.push(`read ${file}`);
      return new ArrayBuffer(4);
    },
    cached: () => cached,
    download: async (url: string, path: string) => {
      calls.push(`download ${url} ${path}`);
      return `file:///cache/${path}`;
    },
  };
  return { service: createSupabaseChatService(client, files), calls };
}

describe('supabase chat images', () => {
  test('an image is uploaded as JPEG under its path before the message is sent with it', async () => {
    const { service, calls } = stub(null);
    const result = await service.send('t1', 'c1', '', IMAGE);
    expect(result.ok && result.message.image).toEqual(STORED.image);
    expect(calls).toEqual([
      'read c1.jpg',
      `upload ${IMAGE_BUCKET} t1/u1/c1.jpg {"contentType":"image/jpeg"}`,
      `rpc send_message {"thread":"t1","client_id":"c1","body":"","image":"t1/u1/c1.jpg","width":1536,"height":2048}`,
    ]);
  });

  test('a retry whose earlier upload already landed sends the message instead of failing', async () => {
    const { service, calls } = stub({ statusCode: '409', code: 'KeyAlreadyExists' });
    expect((await service.send('t1', 'c1', '', IMAGE)).ok).toBe(true);
    expect(calls.some((call) => call.startsWith('rpc send_message'))).toBe(true);
  });

  test('a failed upload is a retryable failure and sends nothing', async () => {
    const { service, calls } = stub({ statusCode: '500', message: 'storage down' });
    expect(await service.send('t1', 'c1', '', IMAGE)).toEqual({ ok: false, failure: 'failed' });
    expect(calls.some((call) => call.startsWith('rpc'))).toBe(false);
  });

  test('a missing upload answered by the server is retryable', async () => {
    const missing = createSupabaseChatService(
      {
        rpc: async () => ({ data: null, error: { message: 'image_missing' } }),
        storage: { from: () => ({ upload: async () => ({ error: null }) }) },
      } as unknown as SupabaseClient,
      { read: async () => new ArrayBuffer(0), cached: () => null, download: async () => '' },
    );
    expect(await missing.send('t1', 'c1', '', IMAGE)).toEqual({ ok: false, failure: 'failed' });
  });

  test('an image is read from the cache when it is there, else downloaded through a signed URL', async () => {
    const hit = stub(null, 'file:///cache/t1_u1_c1.jpg');
    expect(await hit.service.imageFile(IMAGE.path)).toBe('file:///cache/t1_u1_c1.jpg');
    expect(hit.calls).toEqual([]);
    const miss = stub(null);
    expect(await miss.service.imageFile(IMAGE.path)).toBe('file:///cache/t1/u1/c1.jpg');
    expect(miss.calls).toEqual([
      `sign ${IMAGE_BUCKET} t1/u1/c1.jpg`,
      'download https://local/t1/u1/c1.jpg?token=x t1/u1/c1.jpg',
    ]);
  });
});

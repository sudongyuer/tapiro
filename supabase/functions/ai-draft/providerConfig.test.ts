import { describe, expect, test } from 'bun:test';

import { LOCAL_ENV } from '../_shared/iap/fakes.ts';
import { captureConsole } from './handlerTestKit.ts';
import { DEEPSEEK_FALLBACK, QWEN_FLASH, singaporeBaseUrl } from './models.ts';
import { fakeProvider } from './provider.ts';
import {
  localTestProvider,
  providerFor,
  providerFromEnv,
  TEST_PROVIDER_HEADER,
} from './providerConfig.ts';
import { TOOL_SCHEMAS } from './tools.ts';

const envOf =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key];

const QWEN = {
  AI_PROVIDER: 'qwen',
  MODEL_STUDIO_WORKSPACE_ID: 'ws-abc123',
  MODEL_STUDIO_API_KEY: 'sk-x',
};

const LOCAL_TEST = {
  ...LOCAL_ENV,
  AI_ALLOW_TEST_PROVIDER: '1',
  AI_TEST_MODEL_STUDIO_URL: 'http://host.docker.internal:54398/compatible-mode/v1',
};

function request(header?: string) {
  return new Request('http://localhost/ai-draft', {
    method: 'POST',
    headers: header ? { [TEST_PROVIDER_HEADER]: header } : {},
  });
}

describe('provider selection', () => {
  test('fake stays the fake; nothing or an unknown name is no provider', () => {
    expect(providerFromEnv(envOf({ AI_PROVIDER: 'fake' }))).toBe(fakeProvider);
    expect(providerFromEnv(envOf({}))).toBeNull();
    expect(providerFromEnv(envOf({ AI_PROVIDER: 'deepseek' }))).toBeNull();
  });

  test('the DeepSeek fallback is used only when MODEL_STUDIO_FALLBACK=deepseek', async () => {
    const models: string[] = [];
    const urls = new Set<string>();
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      urls.add(String(url));
      models.push(JSON.parse(String(init.body)).model);
      return Response.json({ error: { code: 'ServiceUnavailable' } }, { status: 503 });
    }) as typeof fetch;
    const call = {
      task: 'answer' as const,
      input: { text: 'x' },
      tools: [TOOL_SCHEMAS.answer],
    };
    try {
      for (const fallback of [undefined, 'deepseek']) {
        const env = envOf(fallback ? { ...QWEN, MODEL_STUDIO_FALLBACK: fallback } : QWEN);
        await captureConsole(async () => {
          await providerFromEnv(env)!
            .generate(call, new AbortController().signal)
            .catch(() => null);
        });
      }
    } finally {
      globalThis.fetch = original;
    }
    expect(models).toEqual([QWEN_FLASH, QWEN_FLASH, DEEPSEEK_FALLBACK]);
    expect([...urls]).toEqual([
      'https://ws-abc123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    ]);
  });

  test('qwen needs both the workspace and the key', () => {
    expect(providerFromEnv(envOf(QWEN))).not.toBeNull();
    expect(providerFromEnv(envOf({ ...QWEN, MODEL_STUDIO_API_KEY: ' ' }))).toBeNull();
    expect(providerFromEnv(envOf({ ...QWEN, MODEL_STUDIO_WORKSPACE_ID: '' }))).toBeNull();
  });

  test('the endpoint is always the Singapore workspace domain', () => {
    expect(singaporeBaseUrl('WS-abc123')).toBe(
      'https://ws-abc123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
    );
    for (const bad of ['', 'evil.example.com/x', 'a.b', '-ws', 'ws_1']) {
      expect(singaporeBaseUrl(bad)).toBeNull();
    }
  });

  test('the test provider exists only on the local stack with the flag and a mock URL', () => {
    expect(localTestProvider(envOf(LOCAL_TEST))).not.toBeNull();
    expect(localTestProvider(envOf({ ...LOCAL_TEST, AI_ALLOW_TEST_PROVIDER: '' }))).toBeNull();
    expect(localTestProvider(envOf({ ...LOCAL_TEST, AI_TEST_MODEL_STUDIO_URL: '' }))).toBeNull();
    expect(localTestProvider(envOf({ ...LOCAL_TEST, SB_REGION: 'ap-southeast-1' }))).toBeNull();
  });

  test('only the header picks the test provider, and only when one exists', () => {
    const test = localTestProvider(envOf(LOCAL_TEST));
    expect(providerFor(request('qwen'), fakeProvider, test)).toBe(test);
    expect(providerFor(request(), fakeProvider, test)).toBe(fakeProvider);
    expect(providerFor(request('fake'), fakeProvider, test)).toBe(fakeProvider);
    expect(providerFor(request('qwen'), fakeProvider, null)).toBe(fakeProvider);
  });
});

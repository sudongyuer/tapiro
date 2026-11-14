import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { parseBountyDraft } from '../../../src/lib/drafts/bountyDraft';
import { localSupabase } from '../../../scripts/local-supabase';
import { DEEPSEEK_FALLBACK, QWEN_ASR, QWEN_FLASH, QWEN_PLUS } from '../ai-draft/models';
import { asrResult, ERRORS, textCompletion, toolCompletion } from '../ai-draft/modelStudioFixtures';
import { transcribeTokens } from '../ai-draft/budget';
import { LOCAL_MOCK_KEY, TEST_PROVIDER_HEADER } from '../ai-draft/providerConfig';

const MOCK_PORT = 54398;
const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const endpoint = `${url}/functions/v1/ai-draft`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const JPEG = '/9j/4AAQSkZJRg==';

const DRAFT_ARGS = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 10,
  currency: 'MYR',
  description: null,
  deadlineAt: '2026-11-13T22:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: 'Pyramid',
};
const USAGE = { prompt_tokens: 1800, completion_tokens: 360 };
const ASR_SECONDS = 9;
const AUDIO = 'AAAAHGZ0eXBNNEEg';

type Seen = {
  authorization: string | null;
  model: string;
  enableThinking: unknown;
  toolChoice: unknown;
  userContent: unknown;
};

const seen: Seen[] = [];

function lastUserText(content: unknown): string {
  if (typeof content === 'string') return content;
  const parts = content as { type: string; text?: string }[];
  return parts.find((part) => part.type === 'text')?.text ?? '';
}

function reply(model: string, text: string, forced: string | null) {
  if (forced === 'translate') {
    return {
      status: 200,
      body: toolCompletion(model, 'translate', { text: '好，我 10 分钟到' }, USAGE),
    };
  }
  if (text.includes('[overloaded]') && model !== DEEPSEEK_FALLBACK) return ERRORS.overloaded;
  if (text.includes('[blocked]')) return ERRORS.inspection;
  if (text.includes('[broken]')) {
    return { status: 200, body: toolCompletion(model, 'draft_bounty', '{"title": "帮', USAGE) };
  }
  if (text.includes('[answer]'))
    return { status: 200, body: textCompletion(model, '一般 RM 10。') };
  return { status: 200, body: toolCompletion(model, 'draft_bounty', DRAFT_ARGS, USAGE) };
}

const mock = Bun.serve({
  port: MOCK_PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/api/v1/services/aigc/multimodal-generation/generation') {
      const body = await req.json();
      const [audio] = body.input.messages[0].content;
      seen.push({
        authorization: req.headers.get('authorization'),
        model: body.model,
        enableThinking: undefined,
        toolChoice: body.parameters,
        userContent: audio.input_audio.data,
      });
      return Response.json(asrResult('Tolong ambil bungkusan saya', ASR_SECONDS));
    }
    if (path !== '/compatible-mode/v1/chat/completions') {
      return new Response('not found', { status: 404 });
    }
    const body = await req.json();
    const user = body.messages.find((message: { role: string }) => message.role === 'user');
    seen.push({
      authorization: req.headers.get('authorization'),
      model: body.model,
      enableThinking: body.enable_thinking,
      toolChoice: body.tool_choice,
      userContent: user?.content,
    });
    const forced = body.tool_choice?.function?.name ?? null;
    const { status, body: answer } = reply(body.model, lastUserText(user?.content), forced);
    return Response.json(answer, { status });
  },
});

let userId = '';
let token = '';
let client: SupabaseClient;

function ask(body: unknown, provider: string | null = 'qwen') {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(provider ? { [TEST_PROVIDER_HEADER]: provider } : {}),
    },
    body: JSON.stringify(body),
  });
}

const draft = (text: string) => ask({ task: 'draft_bounty', input: { text } });

async function energy() {
  const { data, error } = await client.rpc('ai_status');
  if (error) throw error;
  return (data as { energy: number }).energy;
}

async function refill() {
  await energy();
  const { error } = await admin.from('ai_energy').update({ level: 1000 }).eq('user_id', userId);
  if (error) throw error;
}

async function meterRows() {
  const { data, error } = await admin
    .from('ai_metering')
    .select('*')
    .eq('user_id', userId)
    .order('id');
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  const email = `ai-provider-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'AI Provider Test' },
  });
  if (error) throw error;
  userId = data.user.id;
  client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  token = signIn.data.session.access_token;
  const consent = await client.rpc('record_consent', { version: 1 });
  if (consent.error) throw consent.error;
});

afterAll(async () => {
  mock.stop(true);
  await admin.auth.admin.deleteUser(userId);
});

describe('ai-draft runs the Model Studio adapter in the Edge Runtime', () => {
  test('a draft goes to the pinned Qwen plus and is charged from its usage', async () => {
    await refill();
    seen.length = 0;
    const response = await draft('帮我取快递，今晚之前');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(parseBountyDraft(body.result).ok).toBe(true);
    expect(seen).toEqual([
      expect.objectContaining({
        authorization: `Bearer ${LOCAL_MOCK_KEY}`,
        model: QWEN_PLUS,
        enableThinking: false,
        toolChoice: { type: 'function', function: { name: 'draft_bounty' } },
      }),
    ]);
    const [row] = await meterRows();
    expect(row).toMatchObject({
      task: 'draft_bounty',
      model: QWEN_PLUS,
      input_tokens: 1800,
      output_tokens: 360,
      discarded: false,
      energy_spent: 200,
    });
    expect(body.energy).toBe(800);
    expect(await energy()).toBe(800);
  });

  test('an overloaded Qwen falls back to DeepSeek through the same account', async () => {
    await refill();
    seen.length = 0;
    const response = await draft('[overloaded] 帮我取快递');
    expect(response.status).toBe(200);
    expect(seen.map((call) => call.model)).toEqual([QWEN_PLUS, DEEPSEEK_FALLBACK]);
    const rows = await meterRows();
    expect(rows.at(-1)).toMatchObject({ model: DEEPSEEK_FALLBACK, discarded: false });
    expect(await energy()).toBe(800);
  });

  test('blocked content is dizzy, tries no fallback and costs nothing', async () => {
    await refill();
    const before = (await meterRows()).length;
    seen.length = 0;
    const response = await draft('[blocked] 帮我取快递');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_error' });
    expect(seen).toHaveLength(1);
    expect(await meterRows()).toHaveLength(before);
    expect(await energy()).toBe(1000);
  });

  test('a broken reply is discarded with its billed tokens and charges nothing', async () => {
    await refill();
    const response = await draft('[broken] 帮我取快递');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_error' });
    expect((await meterRows()).at(-1)).toMatchObject({
      model: QWEN_PLUS,
      input_tokens: 1800,
      discarded: true,
      energy_spent: 0,
    });
    expect(await energy()).toBe(1000);
  });

  test('a question in ask answered in plain words comes back as an answer', async () => {
    await refill();
    const response = await ask({ task: 'ask', input: { text: '[answer] 押金要多少？' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      tool: 'answer',
      result: { text: '一般 RM 10。' },
    });
    expect((await meterRows()).at(-1)).toMatchObject({
      task: 'ask',
      model: QWEN_PLUS,
      input_tokens: 22,
      output_tokens: 18,
      discarded: false,
    });
    expect(await energy()).toBeLessThan(1000);
  });

  test('a screenshot reaches the model as a JPEG data URL', async () => {
    seen.length = 0;
    const response = await ask({
      task: 'ask',
      input: { text: '', image: { mediaType: 'image/jpeg', data: JPEG } },
    });
    expect(response.status).toBe(200);
    expect(seen[0].userContent).toContainEqual({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${JPEG}` },
    });
  });

  test('a translation uses the pinned flash model', async () => {
    seen.length = 0;
    const response = await ask({
      task: 'translate',
      input: { text: 'OK, saya sampai', to: 'zh-Hans' },
    });
    expect(await response.json()).toMatchObject({
      tool: 'translate',
      result: { text: '好，我 10 分钟到' },
    });
    expect(seen.map((call) => call.model)).toEqual([QWEN_FLASH]);
  });

  test('a recording goes to the pinned ASR model and is charged by its billed seconds', async () => {
    await refill();
    seen.length = 0;
    const response = await ask({
      task: 'transcribe',
      input: { audio: { mediaType: 'audio/mp4', data: AUDIO }, language: 'ms' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      tool: 'transcript',
      result: { text: 'Tolong ambil bungkusan saya' },
    });
    expect(seen).toEqual([
      expect.objectContaining({
        model: QWEN_ASR,
        toolChoice: { format: 'm4a', sample_rate: '16000', language_hints: ['ms'] },
        userContent: `data:audio/mp4;base64,${AUDIO}`,
      }),
    ]);
    const rows = await meterRows();
    expect(rows.at(-1)).toMatchObject({
      task: 'transcribe',
      model: QWEN_ASR,
      input_tokens: transcribeTokens(ASR_SECONDS),
      output_tokens: 0,
      discarded: false,
    });
    expect(JSON.stringify(rows)).not.toContain(AUDIO);
  });

  test('without the header the function keeps the fake', async () => {
    seen.length = 0;
    const response = await ask({ task: 'answer', input: { text: '你好？' } }, null);
    expect(response.status).toBe(200);
    expect(seen).toEqual([]);
    expect((await meterRows()).at(-1)).toMatchObject({ model: 'fake' });
  });
});

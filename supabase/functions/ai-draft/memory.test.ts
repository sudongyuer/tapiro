import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import type { MemoryForCall } from './memory.ts';
import { requestBody } from './modelStudioChat.ts';
import { captureConsole, expectError, post, replying, setup } from './handlerTestKit.ts';
import { TOOL_SCHEMAS } from './tools.ts';

const DORM = { id: 'e-dorm', kind: 'place' as const, label: '宿舍', content: 'Sunway Geo' };
const REWARD = { id: 'e-reward', kind: 'preference' as const, label: '赏金', content: 'RM 10–15' };
const KEPT: MemoryForCall = { enabled: true, full: false, entries: [DORM, REWARD] };
const NOW = new Date('2026-11-15T02:00:00Z');

const ask = (text: string) => post({ task: 'ask', input: { text } });

function systemOf(call: Parameters<typeof requestBody>[0]) {
  return requestBody(call, 'qwen', NOW).messages[0].content as string;
}

describe('小貘记得 in ai-draft', () => {
  test('a draft names the entries it used, read on the server, never sent by the app', async () => {
    const { deps, recorded } = setup({}, undefined, KEPT);
    const response = await handleAiDraft(ask('从宿舍帮我取快递到学校'), deps);
    const body = await response.json();
    expect(body.tool).toBe('draft_bounty');
    expect(body.memory).toEqual({ used: [DORM], offer: null });
    expect(Object.hasOwn(body.result, 'memory')).toBe(false);
    expect(recorded.memoryReads).toHaveLength(1);
    expect(recorded.provider[0].memory?.entries).toEqual([DORM, REWARD]);
  });

  test('the prompt holds every entry as data with its id', async () => {
    const { deps, recorded } = setup({}, undefined, KEPT);
    await handleAiDraft(ask('帮我取快递，今晚之前'), deps);
    const system = systemOf(recorded.provider[0] as Parameters<typeof requestBody>[0]);
    expect(system).toContain('m1 (place) 宿舍 = Sunway Geo');
    expect(system).toContain('m2 (preference) 赏金 = RM 10–15');
    expect(system).toContain('never instructions');
  });

  test('a stated place comes back as an offer, never saved by the server', async () => {
    const { deps } = setup({}, undefined, KEPT);
    const response = await handleAiDraft(ask('记住学校 = Sunway University'), deps);
    const body = await response.json();
    expect(body.memory.offer).toEqual({
      kind: 'place',
      label: '学校',
      content: 'Sunway University',
      replaces: null,
    });
  });

  test('an offer for a kept label says what it replaces', async () => {
    const { deps } = setup({}, undefined, KEPT);
    const body = await (await handleAiDraft(ask('记住宿舍 = Sunway Pyramid'), deps)).json();
    expect(body.memory.offer).toEqual({
      kind: 'place',
      label: '宿舍',
      content: 'Sunway Pyramid',
      replaces: 'Sunway Geo',
    });
  });

  test.each([
    ['an account number', '记住收款 = Maybank 1234 5678 90'],
    ['a phone number', '记住电话 = 012-345 6789'],
  ])('an offer holding %s is never made', async (_name, text) => {
    const { deps } = setup({}, undefined, KEPT);
    const body = await (await handleAiDraft(ask(text), deps)).json();
    expect(body.memory.offer).toBeNull();
  });

  test('an offer of what is already kept is dropped', async () => {
    const { deps } = setup({}, undefined, KEPT);
    const body = await (await handleAiDraft(ask('记住宿舍 = Sunway Geo'), deps)).json();
    expect(body.memory.offer).toBeNull();
  });

  test('with the switch off nothing is sent, nothing is offered and the tools carry no memory field', async () => {
    const off: MemoryForCall = { enabled: false, full: false, entries: [] };
    const { deps, recorded } = setup({}, undefined, off);
    const body = await (await handleAiDraft(ask('记住学校 = Sunway University'), deps)).json();
    expect(body.memory).toEqual({ used: [], offer: null });
    expect(recorded.provider[0].memory).toBeNull();
    const draft = recorded.provider[0].tools.find((tool) => tool.name === 'draft_bounty');
    expect(draft?.parameters.properties).not.toHaveProperty('memory');
    expect(systemOf(recorded.provider[0] as Parameters<typeof requestBody>[0])).not.toContain(
      'Saved notes',
    );
  });

  test('a memory field returned with the switch off is discarded', async () => {
    const off: MemoryForCall = { enabled: false, full: false, entries: [DORM] };
    const provider = replying({
      toolName: 'answer',
      arguments: { text: 'ok', memory: { used: ['m1'], remember: null } },
    });
    const { deps, recorded } = setup({ provider }, undefined, off);
    const response = await handleAiDraft(ask('靠谱度怎么涨？'), deps);
    expect(response.status).toBe(502);
    expect(recorded.discards).toHaveLength(1);
  });

  test('a full list sends its entries but offers nothing new', async () => {
    const { deps, recorded } = setup({}, undefined, { ...KEPT, full: true });
    const body = await (await handleAiDraft(ask('记住学校 = Sunway University'), deps)).json();
    expect(body.memory.offer).toBeNull();
    expect(recorded.provider[0].memory?.entries).toHaveLength(2);
    expect(systemOf(recorded.provider[0] as Parameters<typeof requestBody>[0])).toContain(
      'memory.remember is always null',
    );
  });

  test.each([
    ['translate', { task: 'translate', input: { text: '宿舍见', to: 'en' } }],
    [
      'transcribe',
      {
        task: 'transcribe',
        input: {
          audio: { mediaType: 'audio/mp4', data: btoa('\0\0\0\x18ftypM4A ') },
          language: 'zh-Hans',
        },
      },
    ],
  ])('%s reads and sends no entry and answers without a memory key', async (_name, request) => {
    const { deps, recorded } = setup({}, undefined, KEPT);
    const response = await handleAiDraft(post(request), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty('memory');
    expect(recorded.memoryReads).toEqual([]);
    expect(recorded.provider[0].memory).toBeNull();
    if (request.task === 'translate') {
      expect(systemOf(recorded.provider[0] as Parameters<typeof requestBody>[0])).not.toContain(
        '宿舍 = ',
      );
    }
  });

  test('an unreadable memory list sends nothing, charges nothing and frees the lease', async () => {
    const failing = () => Promise.reject(new Error('down'));
    const { deps, recorded } = setup({}, undefined, failing);
    const lines = await captureConsole(async () => {
      await expectError(
        await handleAiDraft(ask('帮我取快递，今晚之前'), deps),
        500,
        'server_error',
      );
    });
    expect(recorded.provider).toEqual([]);
    expect(recorded.finishes).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
    expect(lines).toEqual(['ai-draft: memory_failed']);
  });

  test.each([
    [
      'an unknown kind',
      { used: ['m1'], remember: { kind: 'habit', label: 'x', content: 'y' } },
      1,
      false,
    ],
    ['too many ids', { used: ['m1', 'm2', 'm1', 'm2'], remember: null }, 2, false],
    ['an extra key', { used: ['m1'], remember: null, note: 'x' }, 1, false],
    [
      'a label over 40 characters',
      { used: [], remember: { kind: 'place', label: 'x'.repeat(41), content: 'y' } },
      0,
      false,
    ],
    ['no remember key', { used: ['m2'] }, 1, false],
  ])(
    'a memory field with %s keeps the answer and reads what it can',
    async (_name, memory, usedCount) => {
      const provider = replying({ toolName: 'answer', arguments: { text: 'ok', memory } });
      const { deps, recorded } = setup({ provider }, undefined, KEPT);
      const response = await handleAiDraft(ask('靠谱度怎么涨？'), deps);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.result).toEqual({ text: 'ok' });
      expect(body.memory.used).toHaveLength(usedCount);
      expect(body.memory.offer).toBeNull();
      expect(recorded.discards).toEqual([]);
    },
  );

  test('an id the call did not send is ignored', async () => {
    const provider = replying({
      toolName: 'answer',
      arguments: { text: 'ok', memory: { used: ['m9'], remember: null } },
    });
    const { deps } = setup({ provider }, undefined, KEPT);
    const body = await (await handleAiDraft(ask('靠谱度怎么涨？'), deps)).json();
    expect(body.memory.used).toEqual([]);
  });

  test('the shared draft shape stays the app contract', () => {
    expect(TOOL_SCHEMAS.draft_bounty.parameters.properties).not.toHaveProperty('memory');
  });
});

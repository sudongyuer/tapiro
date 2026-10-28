import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBlockService } from './blockService';
import { createFixtureBlockService } from './fixtureBlockService';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answers: Record<string, Answer | (() => Promise<never>)>) {
  const calls: { name: string; args: unknown }[] = [];
  const answer = (name: string) => {
    const found = answers[name] ?? { data: null, error: null };
    return typeof found === 'function' ? found() : Promise.resolve(found);
  };
  const query = (table: string) => {
    const steps: unknown[] = [];
    const chain = {
      select: (columns: string) => (steps.push({ select: columns }), chain),
      order: (column: string, options: unknown) => (steps.push({ order: column, options }), chain),
      in: (column: string, values: unknown) => (steps.push({ in: column, values }), chain),
      returns: () => {
        calls.push({ name: `from:${table}`, args: steps });
        return answer(`from:${table}`);
      },
    };
    return chain;
  };
  const client = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name);
    },
    from: query,
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('supabase block service', () => {
  test('blocks and unblocks through the RPCs', async () => {
    const stub = stubClient({});
    const service = createSupabaseBlockService(stub.client);
    expect(await service.block('lin')).toBe('blocked');
    await service.unblock('lin');
    expect(stub.calls).toEqual([
      { name: 'block_user', args: { target: 'lin' } },
      { name: 'unblock_user', args: { target: 'lin' } },
    ]);
  });

  test('a poster without an account answers gone; other errors throw', async () => {
    const gone = stubClient({
      block_user: { data: null, error: { message: 'user_not_found', code: 'P0002' } },
    });
    expect(await createSupabaseBlockService(gone.client).block('x')).toBe('gone');
    const failing = stubClient({
      block_user: { data: null, error: { message: 'cannot_block_self', code: '22023' } },
      unblock_user: () => Promise.reject(new TypeError('Network request failed')),
    });
    const service = createSupabaseBlockService(failing.client);
    await expect(service.block('me')).rejects.toBeDefined();
    await expect(service.unblock('x')).rejects.toBeDefined();
  });

  test('lists the newest block first with names from profiles', async () => {
    const stub = stubClient({
      'from:blocks': { data: [{ blocked_id: 'jie' }, { blocked_id: 'lin' }], error: null },
      'from:profiles': {
        data: [
          { id: 'lin', display_name: '小林' },
          { id: 'jie', display_name: '阿杰' },
        ],
        error: null,
      },
    });
    expect(await createSupabaseBlockService(stub.client).list()).toEqual([
      { id: 'jie', name: '阿杰' },
      { id: 'lin', name: '小林' },
    ]);
    expect(stub.calls).toEqual([
      {
        name: 'from:blocks',
        args: [{ select: 'blocked_id' }, { order: 'created_at', options: { ascending: false } }],
      },
      {
        name: 'from:profiles',
        args: [{ select: 'id, display_name' }, { in: 'id', values: ['jie', 'lin'] }],
      },
    ]);
  });

  test('an empty list skips the profile read; a failed read throws', async () => {
    const empty = stubClient({ 'from:blocks': { data: [], error: null } });
    expect(await createSupabaseBlockService(empty.client).list()).toEqual([]);
    expect(empty.calls).toHaveLength(1);
    const failing = stubClient({
      'from:blocks': { data: [{ blocked_id: 'lin' }], error: null },
      'from:profiles': { data: null, error: { message: 'boom', code: '500' } },
    });
    await expect(createSupabaseBlockService(failing.client).list()).rejects.toBeDefined();
  });
});

describe('fixture block service', () => {
  const people = [
    { id: 'lin', name: '小林' },
    { id: 'jie', name: '阿杰' },
  ];

  test('blocks, lists newest first and unblocks', async () => {
    const { service, isBlocked } = createFixtureBlockService({ people });
    expect(await service.block('lin')).toBe('blocked');
    expect(await service.block('jie')).toBe('blocked');
    expect(await service.block('lin')).toBe('blocked');
    expect(await service.list()).toEqual([
      { id: 'jie', name: '阿杰' },
      { id: 'lin', name: '小林' },
    ]);
    expect(isBlocked('lin')).toBe(true);
    await service.unblock('lin');
    expect(isBlocked('lin')).toBe(false);
    expect(await service.list()).toEqual([{ id: 'jie', name: '阿杰' }]);
  });

  test('an unknown person answers gone', async () => {
    const { service } = createFixtureBlockService({ people });
    expect(await service.block('nobody')).toBe('gone');
    expect(await service.list()).toEqual([]);
  });

  test('failOnce fails the first block and the first unblock, then works', async () => {
    const { service, isBlocked } = createFixtureBlockService({ people, failOnce: true });
    await expect(service.block('lin')).rejects.toBeDefined();
    expect(isBlocked('lin')).toBe(false);
    expect(await service.block('lin')).toBe('blocked');
    await expect(service.unblock('lin')).rejects.toBeDefined();
    expect(isBlocked('lin')).toBe(true);
    await service.unblock('lin');
    expect(isBlocked('lin')).toBe(false);
  });
});

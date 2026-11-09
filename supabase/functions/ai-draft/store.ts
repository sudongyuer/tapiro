import type { AiStore, BeginResult } from './handler.ts';

type RpcClient = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export function rpcStore(client: RpcClient): AiStore {
  async function call(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(`${name} failed`);
    return data;
  }
  return {
    async begin(userId) {
      return (await call('ai_begin_call', { uid: userId })) as BeginResult;
    },
    async finish(row) {
      return (await call('ai_finish_call', {
        uid: row.userId,
        held: row.lease,
        task: row.task,
        model: row.model,
        input_tokens: row.inputTokens,
        output_tokens: row.outputTokens,
        energy_spent: row.energySpent,
      })) as { energy: number; energyFull: number };
    },
    async abort(userId, lease) {
      await call('ai_abort_call', { uid: userId, held: lease });
    },
  };
}

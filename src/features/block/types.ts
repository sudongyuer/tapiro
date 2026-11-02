export type BlockedPerson = { id: string; name: string | null };

export type BlockOutcome = 'blocked' | 'gone';

export type BlockService = {
  block(target: string): Promise<BlockOutcome>;
  unblock(target: string): Promise<void>;
  list(): Promise<BlockedPerson[]>;
};

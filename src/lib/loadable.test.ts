import { describe, expect, test } from 'bun:test';

import { createRequests } from './loadable';

describe('requests', () => {
  test('a write drops a read in flight, and a read started before a dirty mark lands stale', () => {
    const requests = createRequests();
    const first = requests.start('k');
    requests.dirty('k');
    expect(requests.outcome('k', first)).toBe('stale');
    expect(requests.supersede('k')).toBe(true);
    expect(requests.outcome('k', first)).toBeNull();
    requests.end('k', first);
    expect(requests.supersede('k')).toBe(false);
  });

  test('reads from before a clear cannot end the reads after it', () => {
    const requests = createRequests();
    const old = requests.start('k');
    requests.clear();
    const fresh = requests.start('k');
    requests.end('k', old);
    expect(requests.busy('k')).toBe(true);
    requests.end('k', fresh);
    expect(requests.busy('k')).toBe(false);
  });
});

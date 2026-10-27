import { describe, expect, test } from 'bun:test';

import { createUserCleanups } from './userCleanups';

describe('user cleanups', () => {
  test('every registered cleanup runs for the user, even after one throws', () => {
    const cleanups = createUserCleanups();
    const ran: string[] = [];
    cleanups.register(() => {
      throw new Error('storage gone');
    });
    cleanups.register((userId) => ran.push(`draft:${userId}`));
    cleanups.run('u1');
    expect(ran).toEqual(['draft:u1']);
  });

  test('an unregistered cleanup no longer runs', () => {
    const cleanups = createUserCleanups();
    const ran: string[] = [];
    const unregister = cleanups.register((userId) => ran.push(userId));
    unregister();
    cleanups.run('u1');
    expect(ran).toEqual([]);
  });
});

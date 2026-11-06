import { describe, expect, test } from 'bun:test';

import type { StageActor } from '@/ui/MascotStage';

import { composeStageActor } from './stageActor';

const growth: StageActor = { wear: 'scarf', say: null, hint: null, onPress: null, action: null };
const open = () => undefined;
const feedPress = () => undefined;
const feed = { say: 'leaf', hint: 'leaf', onPress: feedPress, action: 'feed' } as const;

describe('compose stage actor', () => {
  test('the level-up goes first: its bubble, its tap, no feed', () => {
    const pending = { ...growth, say: 'grew', hint: 'star', onPress: open } as const;
    const actor = composeStageActor(pending, feed);
    expect(actor.say).toBe('grew');
    expect(actor.onPress).toBe(open);
  });

  test('a feed already running finishes before a level-up takes the stage', () => {
    const pending = { ...growth, say: 'grew', hint: 'star', onPress: open } as const;
    const actor = composeStageActor(pending, { ...feed, overlay: 'leaf' });
    expect(actor.say).toBe('leaf');
    expect(actor.onPress).toBe(feedPress);
  });

  test('with no level-up the feed speaks, and what is worn stays', () => {
    const actor = composeStageActor(growth, feed);
    expect(actor.say).toBe('leaf');
    expect(actor.onPress).toBe(feedPress);
    expect(actor.wear).toBe('scarf');
  });
});

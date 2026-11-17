import { expect, test } from 'bun:test';

import { splitLead } from './splitLead';

test('the first sentence leads and the rest follows, with no word changed', () => {
  expect(splitLead('小貘晕了，没扣体力。你写的还在。')).toEqual({
    lead: '小貘晕了，没扣体力。',
    rest: '你写的还在。',
  });
  expect(splitLead('Tapir got dizzy. No energy was used. Your text is still here.')).toEqual({
    lead: 'Tapir got dizzy.',
    rest: 'No energy was used. Your text is still here.',
  });
});

test('one sentence stays whole', () => {
  expect(splitLead('小貘还在忙上一件，过一会儿再试。')).toEqual({
    lead: '小貘还在忙上一件，过一会儿再试。',
    rest: '',
  });
  expect(splitLead('Update v1.2 first')).toEqual({ lead: 'Update v1.2 first', rest: '' });
});

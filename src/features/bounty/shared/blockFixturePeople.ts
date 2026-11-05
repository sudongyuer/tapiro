import { addBlockFixturePeople } from '@/features/block';
import { uiVerify } from '@/lib/uiVerify';

import { FIXTURE_BOARDS } from '../board/fixtureBoardData';
import { FIXTURE_APPLICANT_PEOPLE } from '../select/fixtureSelectService';

if (uiVerify) {
  const people = new Map<string, string | null>();
  for (const board of Object.values(FIXTURE_BOARDS)) {
    for (const item of board) people.set(item.poster.id, item.poster.name);
  }
  addBlockFixturePeople([
    ...[...people].map(([id, name]) => ({ id, name })),
    ...FIXTURE_APPLICANT_PEOPLE,
  ]);
}

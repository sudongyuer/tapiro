import type {
  FaceCounts,
  ItemKind,
  MyMascot,
  PendingReview,
  Person,
  ProfileCard,
  ProfileReview,
  ReviewPair,
  Role,
  TierDrop,
} from './types';

export const REP_VARIANTS = ['many', 'one', 'empty', 'failed', 'worst'] as const;
export type RepVariant = (typeof REP_VARIANTS)[number];

export const repVariant = (value: string | undefined): RepVariant =>
  REP_VARIANTS.find((variant) => variant === value) ?? 'many';

export const FIXTURE_REP_USER_ID = '00000000-0000-4000-8000-000000000001';

const ME: Person = { id: FIXTURE_REP_USER_ID, name: '林小貘', avatarUrl: null };

export const FIXTURE_PEOPLE: Record<string, Person> = {
  lin: { id: 'fixture-person-lin', name: '小林', avatarUrl: null },
  mei: { id: 'fixture-person-mei', name: 'Mei', avatarUrl: null },
  aming: { id: 'fixture-person-aming', name: '阿明', avatarUrl: null },
  aiman: {
    id: 'fixture-person-aiman',
    name: 'Muhammad Aiman bin Abdullah Hakimi Zulkarnain',
    avatarUrl: null,
  },
  siti: { id: 'fixture-person-siti', name: 'Siti Nurhaliza binti Ahmad', avatarUrl: null },
};

const DAY = 86_400_000;

const at = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString();

export function fixturePairs(
  kind: ItemKind,
  itemId: string,
  variant: RepVariant,
  now: Date,
): ReviewPair[] {
  if (variant === 'empty') return [];
  const worst = variant === 'worst';
  const pair = (person: Person, role: Role, closesIn: number): ReviewPair => ({
    kind,
    itemId,
    counterpart: person,
    role,
    closesAt: at(now, closesIn),
    state: 'open',
    theyReviewed: false,
    mine: null,
    theirs: null,
  });
  if (kind === 'bounty') {
    const person = worst ? FIXTURE_PEOPLE.aiman : FIXTURE_PEOPLE.lin;
    const role = worst ? 'poster' : 'helper';
    return [{ ...pair(person, role, 7), theyReviewed: variant !== 'one' && !worst }];
  }
  const asRider = itemId.endsWith('-rider');
  if (asRider) return [pair(worst ? FIXTURE_PEOPLE.aiman : FIXTURE_PEOPLE.lin, 'organiser', 5)];
  if (variant === 'one') return [pair(FIXTURE_PEOPLE.mei, 'rider', 6)];
  return [
    pair(FIXTURE_PEOPLE.mei, 'rider', 6),
    {
      ...pair(FIXTURE_PEOPLE.aming, 'rider', 6),
      state: 'sealed',
      mine: {
        id: 'fixture-review-mine',
        face: 'happy',
        chips: ['on_time', 'good_company'],
        sentence: null,
        submittedAt: at(now, -1),
        shownAt: null,
        reply: null,
        editable: true,
      },
    },
    { ...pair(FIXTURE_PEOPLE.aiman, 'rider', 5), theyReviewed: true },
    { ...pair(FIXTURE_PEOPLE.siti, 'rider', -1), state: 'ended' },
  ];
}

export function fixturePending(variant: RepVariant, now: Date): PendingReview[] {
  if (variant === 'empty') return [];
  const rows: PendingReview[] = [
    {
      kind: 'bounty',
      itemId: 'fixture-bounty-settled',
      title:
        variant === 'worst'
          ? 'Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences blok C tingkat 23'
          : '帮取快递',
      counterpart: variant === 'worst' ? FIXTURE_PEOPLE.aiman : FIXTURE_PEOPLE.lin,
      role: 'helper',
      closesAt: at(now, 6),
      theyReviewed: true,
    },
    {
      kind: 'ride',
      itemId: 'fixture-ride-closed',
      title: '双威 → KLIA2',
      counterpart: FIXTURE_PEOPLE.mei,
      role: 'rider',
      closesAt: at(now, 2),
      theyReviewed: false,
    },
  ];
  return variant === 'one' ? rows.slice(0, 1) : rows;
}

const review = (n: number, now: Date, overrides: Partial<ProfileReview> = {}): ProfileReview => ({
  id: `fixture-profile-review-${String(n).padStart(3, '0')}`,
  face: 'happy',
  chips: ['on_time', 'kept_posted'],
  sentence: null,
  submittedAt: at(now, -n - 1),
  shownAt: at(now, -n),
  reply: null,
  kind: 'bounty',
  role: 'helper',
  title: '帮取快递',
  reviewer: FIXTURE_PEOPLE.aming,
  ...overrides,
});

export function fixtureReviews(variant: RepVariant, now: Date): ProfileReview[] {
  if (variant === 'empty') return [];
  if (variant === 'one') return [review(1, now)];
  const total = variant === 'worst' ? 128 : 24;
  return Array.from({ length: total }, (_, index) => {
    const n = index + 1;
    if (n === 2) {
      return review(n, now, {
        face: 'unhappy',
        chips:
          variant === 'worst' ? ['late', 'no_heads_up', 'unfinished', 'item_damaged'] : ['late'],
        sentence:
          variant === 'worst'
            ? '等了四十分钟也没有说一声，东西送到的时候盒子已经压坏了，里面的杯子碎了一个，希望下次可以提前告诉我会晚到，这样我可以先去上课。'
            : '等了 40 分钟，也没说一声。',
        reviewer: FIXTURE_PEOPLE.lin,
        reply: { body: '那天电梯坏了，抱歉没及时告诉你。', createdAt: at(now, -1) },
      });
    }
    if (n === 3)
      return review(n, now, { kind: 'ride', role: 'rider', title: null, reviewer: null });
    if (n % 7 === 0) return review(n, now, { face: 'okay', chips: ['no_heads_up'] });
    return review(n, now);
  });
}

const faces = (rows: ProfileReview[]): FaceCounts => ({
  happy: rows.filter((row) => row.face === 'happy').length,
  okay: rows.filter((row) => row.face === 'okay').length,
  unhappy: rows.filter((row) => row.face === 'unhappy').length,
});

export function fixtureProfile(
  personId: string,
  variant: RepVariant,
  now: Date,
  reviews: ProfileReview[],
): ProfileCard {
  const self = personId === FIXTURE_REP_USER_ID;
  const person =
    Object.values(FIXTURE_PEOPLE).find((row) => row.id === personId) ??
    (self ? ME : { id: personId, name: null, avatarUrl: null });
  const fresh = variant === 'empty';
  const worst = variant === 'worst';
  return {
    ...(worst && !self ? FIXTURE_PEOPLE.aiman : person),
    id: personId,
    joinedAt: at(now, fresh ? -2 : -200),
    self,
    blockedByMe: false,
    tier: fresh ? 'new_friend' : worst ? 'tapir_friend' : 'very_reliable',
    helped: fresh ? 0 : worst ? 87 : 9,
    settled: fresh ? 0 : variant === 'one' ? 3 : worst ? 1204 : 25,
    completionRate: fresh || variant === 'one' ? null : worst ? 0.99 : 0.96,
    reviewCount: reviews.length,
    faces: faces(reviews),
    latestReviews: reviews.slice(0, 3),
    mascot: {
      level: fresh ? 1 : worst ? 85 : 4,
      stickers: fresh ? 0 : worst ? 1234 : 23,
      accessory: fresh ? null : worst ? 'scarf' : 'umbrella',
    },
  };
}

export function fixtureMascot(variant: RepVariant): MyMascot {
  if (variant === 'empty') {
    return {
      level: 1,
      stickers: 0,
      accessory: null,
      seenLevel: 1,
      levelUp: false,
      nextLevelAt: 3,
      chosenAccessory: null,
      unlocked: [],
    };
  }
  return {
    level: 5,
    stickers: 25,
    accessory: 'scarf',
    seenLevel: 4,
    levelUp: true,
    nextLevelAt: 40,
    chosenAccessory: null,
    unlocked: ['red_hat', 'backpack', 'umbrella', 'scarf'],
  };
}

export const TIER_DROP_VARIANTS = ['none', 'noShows', 'reviews', 'both', 'fewer', 'worst'] as const;
export type TierDropVariant = (typeof TIER_DROP_VARIANTS)[number];

export const tierDropVariant = (value: string | undefined): TierDropVariant =>
  TIER_DROP_VARIANTS.find((variant) => variant === value) ?? 'none';

const WORST_NO_SHOWS = [
  'Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences sebelum pukul lapan malam',
  null,
  '帮忙去 Sunway Pyramid 地下一层的超市买一箱矿泉水和两袋大米，送到 Sunway Geo Residences A 座 12 楼',
];

export function fixtureTierDrop(variant: TierDropVariant, now: Date): TierDrop | null {
  if (variant === 'none') return null;
  const noShows =
    variant === 'worst'
      ? WORST_NO_SHOWS.map((title, index) => ({
          at: at(now, -20 - index * 30),
          kind: title === null ? ('ride' as const) : ('bounty' as const),
          title,
        }))
      : variant === 'noShows' || variant === 'both'
        ? [{ at: at(now, -30), kind: 'bounty' as const, title: '帮取快递' }]
        : [];
  const worst = variant === 'worst';
  return {
    id: worst ? 7 : 1,
    from: worst ? 'tapir_friend' : 'very_reliable',
    to: 'reliable',
    droppedAt: at(now, 0),
    noShows,
    noShowCount: worst ? 5 : noShows.length,
    negativeReviews: worst ? 12 : variant === 'reviews' || variant === 'both' ? 2 : 0,
    settled: worst ? 31 : 8,
    people: worst ? 17 : 4,
    toRegain: {
      tier: worst ? 'tapir_friend' : 'very_reliable',
      settled: worst ? 12 : 2,
      newPeople: worst ? 6 : variant === 'reviews' ? 0 : 1,
      goodReviews: worst ? 18 : variant === 'reviews' || variant === 'both' ? 3 : 0,
    },
  };
}

begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated',
  'authenticated', 'u' || n || '@example.com', jsonb_build_object('full_name', 'User ' || n)
from generate_series(100, 120) n
union all
select ('00000000-0000-0000-0000-000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated',
  'authenticated', 'u' || n || '@example.com', jsonb_build_object('full_name', 'Peer ' || n)
from generate_series(201, 212) n;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-000000000' || n)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.settle(subject text, times integer, counterparts integer) returns void language sql as $$
  insert into public.reputation_events (user_id, kind, item_kind, item_id, counterpart_id)
  select pg_temp.u(subject), 'settled', 'bounty', gen_random_uuid(), pg_temp.u((201 + i % counterparts)::text)
  from generate_series(0, times - 1) as i;
$$;

create function pg_temp.review(subject text, negatives integer, goods integer, sealed boolean default false)
returns void language sql as $$
  insert into public.reviews (
    item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, chips, negative, closes_at
  )
  select 'bounty', gen_random_uuid(), pg_temp.u((201 + i)::text), pg_temp.u(subject), 'helper',
    case when i < negatives then 'unhappy' else 'happy' end::public.review_face,
    case when i < negatives then array['late'] else '{}' end, i < negatives,
    case when sealed then now() + interval '3 days' else now() - interval '1 day' end
  from generate_series(0, negatives + goods - 1) as i;
$$;

create function pg_temp.tier(n text) returns text language sql as $$
  select tier::text from public.reputation_snapshots where user_id = pg_temp.u(n);
$$;

select is(private.tier_for(2, 2, 1, interval '0', 2, 0), 'reliable'::public.reputation_tier,
  'fewer than 3 reviews never gate a tier');
select is(private.tier_for(2, 2, 1, interval '0', 3, 0.6667), 'new_friend'::public.reputation_tier,
  'from 3 reviews a share under 70% without negative chips blocks 靠谱');
select is(private.tier_for(2, 2, 1, interval '0', 3, 0.7), 'reliable'::public.reputation_tier, '70% is enough for 靠谱');
select is(private.tier_for(5, 4, 1, interval '60 days', 10, 0.79), 'reliable'::public.reputation_tier,
  'very reliable needs 80%');
select is(private.tier_for(12, 8, 1, interval '180 days', 10, 0.89), 'very_reliable'::public.reputation_tier,
  'tapir friend needs 90%');
select is(private.tier_for(12, 8, 1, interval '180 days', null, null), 'tapir_friend'::public.reputation_tier,
  'the thresholds without reviews are unchanged');

select pg_temp.settle('100', 2, 2);
select pg_temp.settle('101', 2, 2);
select pg_temp.settle('102', 2, 2);
select pg_temp.settle('103', 2, 2);
select pg_temp.review('103', 2, 0, true);
select public.recompute_reputation();
select is(
  (select array_agg(pg_temp.tier(n) order by n) from unnest(array['100', '101', '102', '103']) n),
  array['reliable', 'reliable', 'reliable', 'reliable'], 'four reliable users to start from'
);
select is((select count(*) from public.tier_drops), 0::bigint, 'a first snapshot is never a drop');

select pg_temp.review('100', 2, 1);
insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
select pg_temp.u('101'), 'no_show', k, gen_random_uuid(), false
from unnest(array['bounty', 'ride']::public.payment_item_kind[]) k;
select pg_temp.review('102', 1, 2);
select public.recompute_reputation();

select is(pg_temp.tier('100'), 'new_friend', 'two of three reviews with negative chips drop the tier');
select is(
  (select row(review_count, good_review_share) from public.reputation_snapshots where user_id = pg_temp.u('100')),
  row(3, 0.3333::numeric(5, 4)), 'the snapshot keeps the review count and the share without negative chips'
);
select is(pg_temp.tier('102'), 'new_friend', 'one in three negative is under 70%');
select is(pg_temp.tier('103'), 'reliable', 'sealed reviews do not count');
select is(
  (select row(from_tier::text, to_tier::text, detail -> 'negativeReviews', detail -> 'toRegain')
   from public.tier_drops where user_id = pg_temp.u('100')),
  row('reliable'::text, 'new_friend'::text, '2'::jsonb,
    '{"tier": "reliable", "settled": 0, "newPeople": 0, "goodReviews": 4}'::jsonb),
  'the drop records the reason and how many good reviews bring 靠谱 back'
);
select is(
  (select row(detail -> 'noShowCount', jsonb_array_length(detail -> 'noShows'), detail -> 'toRegain' -> 'settled')
   from public.tier_drops where user_id = pg_temp.u('101')),
  row('2'::jsonb, 2, '6'::jsonb),
  'a drop from no-shows lists them and the settled items that bring the rate back to 80%'
);
select is(
  (select detail -> 'noShows' -> 0 ->> 'kind' from public.tier_drops where user_id = pg_temp.u('101')), 'ride',
  'no-shows are listed newest first'
);

select pg_temp.settle('104', 1, 1);
select public.recompute_reputation();
select pg_temp.settle('104', 2, 2);
select public.recompute_reputation();
select is(pg_temp.tier('104'), 'reliable', 'a rise is recorded in the snapshot');
select is((select count(*) from public.tier_drops where user_id = pg_temp.u('104')), 0::bigint, 'a rise is silent');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('100'));
select is(
  (select row(d ->> 'from', d ->> 'to') from public.pending_tier_drop() d),
  row('reliable'::text, 'new_friend'::text), 'the dropped user reads the drop once'
);
select public.mark_tier_drop_seen((public.pending_tier_drop() ->> 'id')::bigint);
select is(public.pending_tier_drop(), null, 'a seen drop is not shown again');
select throws_ok($$select * from public.tier_drops$$, '42501', null, 'clients cannot read the drops table');
select throws_ok($$select review_count from public.reputation_snapshots$$, '42501', null,
  'the review numbers stay private like the other inputs');

select pg_temp.act_as(pg_temp.u('101'));
select is(public.pending_tier_drop() ->> 'to', 'new_friend', 'each user reads only their own drop');

reset role;
delete from public.reputation_events where user_id = pg_temp.u('101') and kind = 'no_show';
select public.recompute_reputation();
set local role authenticated;
select pg_temp.act_as(pg_temp.u('101'));
select is(public.pending_tier_drop(), null, 'a drop already recovered from is not announced');

reset role;
select is(
  (select row(schedule, command) from cron.job where jobname = 'reputation-recompute-daily'),
  row('30 19 * * *'::text, 'select public.recompute_reputation()'::text), 'the daily recompute is unchanged'
);

select * from finish();
rollback;

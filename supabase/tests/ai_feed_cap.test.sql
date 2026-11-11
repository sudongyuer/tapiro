begin;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', k)
from (values ('a1'), ('b2')) v (k);

create function pg_temp.uid(k text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.uid(k)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.hungry(k text) returns void language sql as $$
  insert into public.ai_energy (user_id, level, refilled_on)
  values (pg_temp.uid(k), 0, private.ai_refill_day(now()))
  on conflict (user_id) do update set level = 0, refilled_on = private.ai_refill_day(now());
$$;

create function pg_temp.pantry_sum(k text) returns bigint language sql as $$
  select coalesce(sum(delta), 0) from public.ai_pantry where user_id = pg_temp.uid(k);
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.uid('a1'), 'help_settled', 10), (pg_temp.uid('b2'), 'help_settled', 6);

select pg_temp.act_as('a1');
select is((public.ai_status() ->> 'feedsLeft')::integer, 5, 'a new day allows five paid leaves');
select is(
  public.ai_status() #>> '{consent,acceptedAt}', null, 'no consent, no consent time'
);
select public.record_consent(1);
select isnt(public.ai_status() #>> '{consent,acceptedAt}', null, 'the status carries when consent was given');
select is(
  (public.ai_status() #>> '{consent,acceptedAt}')::timestamptz,
  (select accepted_at from public.ai_consents where user_id = pg_temp.uid('a1') and withdrawn_at is null),
  'and it is the active consent''s time'
);
select is(public.withdraw_consent() #>> '{consent,acceptedAt}', null, 'a withdrawn consent has no consent time');

select public.swap_coin_for_leaf() from generate_series(1, 7);
select is(pg_temp.pantry_sum('a1'), 7::bigint, 'swapping has no daily cap: leaves wait in the pantry');

select pg_temp.hungry('a1');
select is((public.feed_leaf() ->> 'feedsLeft')::integer, 4, 'feeding answers how many feeds are left today');
select pg_temp.hungry('a1');
select public.feed_leaf();
select pg_temp.hungry('a1');
select public.feed_leaf();
select pg_temp.hungry('a1');
select public.feed_leaf();
select pg_temp.hungry('a1');
select is((public.feed_leaf() ->> 'feedsLeft')::integer, 0, 'the fifth feed of the day uses the last one');

select pg_temp.hungry('a1');
select throws_ok('select public.feed_leaf()', '55000', 'fed_enough', 'a sixth feed that day is refused');
select is(pg_temp.pantry_sum('a1'), 2::bigint, 'the refused feed keeps its leaf');
select is(
  (select level from public.ai_energy where user_id = pg_temp.uid('a1')), 0, 'and leaves the belly empty'
);

update public.ai_energy set level = 1000 where user_id = pg_temp.uid('a1');
select throws_ok(
  'select public.feed_leaf()', '55000', 'already_full', 'a full belly still answers already_full when capped'
);

select pg_temp.act_as('b2');
select pg_temp.hungry('b2');
select throws_ok('select public.feed_leaf()', '55000', 'no_leaf', 'the cap is per user: another user is not capped');
select is((public.ai_status() ->> 'feedsLeft')::integer, 5, 'and still has five');

select public.swap_coin_for_leaf() from generate_series(1, 5);
insert into public.ai_pantry (user_id, reason, delta, created_at)
select pg_temp.uid('b2'), 'feed', -1, now() - interval '1 day' from generate_series(1, 5);
select is((public.ai_status() ->> 'feedsLeft')::integer, 5, 'feeds before the last 06:00 do not count');
select public.swap_coin_for_leaf();
select lives_ok('select public.feed_leaf()', 'so a user capped yesterday feeds again today');

select * from finish();
rollback;

begin;
select plan(14);

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

create function pg_temp.coins(k text) returns bigint language sql as $$
  select coalesce(sum(delta), 0) from public.coin_ledger where user_id = pg_temp.uid(k);
$$;

create function pg_temp.pantry_sum(k text) returns bigint language sql as $$
  select coalesce(sum(delta), 0) from public.ai_pantry where user_id = pg_temp.uid(k);
$$;

-- A new account starts with its welcome coins; each case sets the balance it needs.
create function pg_temp.set_coins(k text, n integer) returns void language sql as $$
  insert into public.coin_ledger (user_id, reason, delta)
  select pg_temp.uid(k), 'post_spend', -pg_temp.coins(k)::integer where pg_temp.coins(k) > 0;
  insert into public.coin_ledger (user_id, reason, delta)
  select pg_temp.uid(k), 'help_settled', n where n > 0;
$$;

select pg_temp.set_coins('a1', 2);

select pg_temp.act_as('a1');
select throws_ok(
  'select public.swap_and_feed_leaf()', '55000', 'already_full', 'a full belly is refused before any coin moves'
);
select is(pg_temp.coins('a1'), 2::bigint, 'and keeps the coin');

select pg_temp.hungry('a1');
select is((public.swap_and_feed_leaf() ->> 'energy')::integer, 1000, 'one tap swaps a coin and fills the belly');
select is(pg_temp.coins('a1'), 1::bigint, 'it spends exactly one coin');
select is(pg_temp.pantry_sum('a1'), 0::bigint, 'the swapped leaf is eaten, not kept');
select is(
  (select count(*) from public.coin_ledger where user_id = pg_temp.uid('a1') and reason = 'pantry_swap'),
  1::bigint,
  'the coin is booked as a pantry swap'
);
select is(
  (select coin_ledger_id from public.ai_pantry where user_id = pg_temp.uid('a1') and reason = 'swap'),
  (select id from public.coin_ledger where user_id = pg_temp.uid('a1') and reason = 'pantry_swap'),
  'the leaf points at its coin'
);
select is((public.ai_status() ->> 'feedsLeft')::integer, 4, 'it counts as a feed against the daily cap');

select pg_temp.hungry('a1');
select public.swap_and_feed_leaf();
select pg_temp.hungry('a1');
select throws_ok(
  'select public.swap_and_feed_leaf()', '55000', 'no_balance', 'with no coin left it is refused'
);
select is(pg_temp.pantry_sum('a1'), 0::bigint, 'and nothing lands in the pantry');

select pg_temp.set_coins('a1', 5);
insert into public.ai_pantry (user_id, reason, delta, created_at)
select pg_temp.uid('a1'), 'feed', -1, now() from generate_series(1, 3);
select throws_ok(
  'select public.swap_and_feed_leaf()', '55000', 'fed_enough', 'a capped user is told to come back tomorrow'
);
select is(pg_temp.coins('a1'), 5::bigint, 'and the coin is not spent');

select pg_temp.set_coins('b2', 0);
select pg_temp.act_as('b2');
select pg_temp.hungry('b2');
select throws_ok('select public.swap_and_feed_leaf()', '55000', 'no_balance', 'another user pays with their own coins');

select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '{}', true);
select throws_ok('select public.swap_and_feed_leaf()', '42501', 'not_signed_in', 'signed out is refused');

select * from finish();
rollback;

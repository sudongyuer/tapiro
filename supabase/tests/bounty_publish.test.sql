begin;
select plan(52);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.balance_of(uid uuid) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(uid);
  return public.coin_balance();
end;
$$;

create function pg_temp.coins_of(uid uuid) returns integer language sql as $$
  select (pg_temp.balance_of(uid) ->> 'coins')::integer;
$$;

create function pg_temp.free_left(uid uuid) returns integer language sql as $$
  select (pg_temp.balance_of(uid) ->> 'freePostsLeft')::integer;
$$;

create function pg_temp.use_free_posts(uid uuid) returns void language plpgsql as $$
begin
  while pg_temp.free_left(uid) > 0 loop
    perform public.spend_post(uid, 'ride', gen_random_uuid());
  end loop;
end;
$$;

create function pg_temp.drain(uid uuid) returns void language plpgsql as $$
begin
  perform pg_temp.use_free_posts(uid);
  while pg_temp.coins_of(uid) > 0 loop
    perform public.spend_post(uid, 'ride', gen_random_uuid());
  end loop;
end;
$$;

create function pg_temp.footprint(item uuid) returns bigint[] language sql as $$
  select array[
    (select count(*) from public.bounties where id = item),
    (select count(*) from public.bounty_addresses where bounty_id = item),
    (select count(*) from public.bounty_events where bounty_id = item),
    (select count(*) from public.post_charges where item_id = item)
  ];
$$;

create function pg_temp.totals() returns bigint[] language sql as $$
  select array[
    (select count(*) from public.bounties),
    (select count(*) from public.bounty_addresses),
    (select count(*) from public.bounty_events),
    (select count(*) from public.post_charges),
    (select count(*) from public.coin_ledger)
  ];
$$;

create temp table results (name text primary key, r jsonb);
grant all on results to authenticated;
create temp table counts (name text primary key, n bigint);
grant all on counts to authenticated;
create temp table snapshots (name text primary key, v bigint[]);

insert into counts values ('a_free', pg_temp.free_left('00000000-0000-0000-0000-0000000000a1'));

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into results
select 'p1', public.publish_bounty('30000000-0000-0000-0000-000000000001', '  帮取快递  ', 'pickup', 500);
reset role;

select is(
  (select r - 'expiresAt' from results where name = 'p1'),
  '{"id": "30000000-0000-0000-0000-000000000001", "status": "open", "charge": "free"}'::jsonb,
  'a first publish is open and uses a free post'
);
select is(
  (select row(status::text, title, expires_at - published_at, poster_id) from public.bounties
   where id = '30000000-0000-0000-0000-000000000001'),
  row('open'::text, '帮取快递'::text, interval '7 days', '00000000-0000-0000-0000-0000000000a1'::uuid),
  'the bounty is stored open, trimmed, by the poster, expiring seven days after publishing'
);
select is(
  (select (r ->> 'expiresAt')::timestamptz from results where name = 'p1'),
  (select expires_at from public.bounties where id = '30000000-0000-0000-0000-000000000001'),
  'the answer carries the stored expiry'
);
select is(
  (select array_agg(row(kind::text, actor_id, to_status::text)::text) from public.bounty_events
   where bounty_id = '30000000-0000-0000-0000-000000000001'),
  array[row('published'::text, '00000000-0000-0000-0000-0000000000a1'::uuid, 'open'::text)::text],
  'publishing writes one published event'
);
select is(
  (select charge::text from public.post_charges where item_kind = 'bounty' and item_id = '30000000-0000-0000-0000-000000000001'),
  'free', 'publishing records the charge'
);
select is(
  pg_temp.free_left('00000000-0000-0000-0000-0000000000a1')::bigint, (select n - 1 from counts where name = 'a_free'),
  'publishing uses one free post'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into results
select 'p2', public.publish_bounty(
  '30000000-0000-0000-0000-000000000002', '排队买奶茶', 'queue', 1000,
  description => '   ', place_label => ' Sunway Pyramid ', latitude => 3.0733, longitude => 101.6067,
  address => ' Block C, 12-3 ', deadline_at => now() + interval '2 days'
);
select is(
  (select address from public.bounty_addresses where bounty_id = '30000000-0000-0000-0000-000000000002'), 'Block C, 12-3',
  'the poster reads the trimmed address'
);
reset role;

select is(
  (select expires_at from public.bounties where id = '30000000-0000-0000-0000-000000000002'), now() + interval '2 days',
  'a deadline is the expiry'
);
select is(
  (select row(extensions.st_y(place::extensions.geometry), extensions.st_x(place::extensions.geometry), place_label)
   from public.bounties where id = '30000000-0000-0000-0000-000000000002'),
  row(3.0733::double precision, 101.6067::double precision, 'Sunway Pyramid'::text),
  'the place is the given point with its trimmed label'
);
select is(
  (select description from public.bounties where id = '30000000-0000-0000-0000-000000000002'), null,
  'a blank description is stored as null'
);

select public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 500);
select public.open_payment('bounty', gen_random_uuid(), '排队', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 500);
insert into snapshots values ('blocked', pg_temp.totals());
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is(public.publish_blocked(), true, 'two unpaid payments block the payer from publishing');
select throws_ok(
  $$select public.publish_bounty('30000000-0000-0000-0000-000000000003', '帮取快递', 'pickup', 500)$$,
  '55000', 'publish_blocked', 'a blocked poster cannot publish'
);
reset role;
select is(pg_temp.totals(), (select v from snapshots where name = 'blocked'), 'a blocked publish writes nothing');

select pg_temp.drain('00000000-0000-0000-0000-0000000000d4');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  $$select public.publish_bounty('30000000-0000-0000-0000-000000000004', '帮取快递', 'pickup', 500,
    place_label => 'Sunway', latitude => 3.0733, longitude => 101.6067, address => 'Block C')$$,
  '55000', 'no_balance', 'without a free post or a coin the publish is rejected'
);
reset role;
select is(
  pg_temp.footprint('30000000-0000-0000-0000-000000000004'), array[0, 0, 0, 0]::bigint[],
  'a publish without balance leaves no bounty, address, event or charge'
);

select pg_temp.use_free_posts('00000000-0000-0000-0000-0000000000e5');
insert into counts values ('e_coins', pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5'));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
insert into results
select 'p5', public.publish_bounty('30000000-0000-0000-0000-000000000005', '帮搬家', 'move', 2000);
reset role;
select is((select r ->> 'charge' from results where name = 'p5'), 'coin', 'a fourth post this month is paid with a coin');
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5')::bigint, (select n - 1 from counts where name = 'e_coins'),
  'the coin post costs one coin'
);

insert into snapshots values ('replay', pg_temp.totals());
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  public.publish_bounty('30000000-0000-0000-0000-000000000001', '  帮取快递  ', 'pickup', 500),
  (select r from results where name = 'p1'), 'replaying a publish returns the first answer'
);
reset role;
select is(pg_temp.totals(), (select v from snapshots where name = 'replay'), 'a replayed publish writes nothing');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.publish_bounty('30000000-0000-0000-0000-000000000001', '帮取快递', 'pickup', 500)$$,
  '22023', 'invalid_bounty', 'another poster cannot publish under a taken id'
);

reset role;
insert into snapshots values ('invalid', pg_temp.totals());
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, place_label => 'Sunway', latitude => 3.0733)$$,
  '22023', 'invalid_bounty', 'a latitude without a longitude is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, latitude => 3.0733, longitude => 101.6067)$$,
  '22023', 'invalid_bounty', 'a place without a label is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, place_label => 'Sunway')$$,
  '22023', 'invalid_bounty', 'a label without a place is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, address => 'Block C')$$,
  '22023', 'invalid_bounty', 'an address without a place is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, latitude => 91, longitude => 101.6067,
    place_label => 'Sunway')$$,
  '22023', 'invalid_bounty', 'a latitude outside the globe is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, starts_at => now() - interval '1 minute')$$,
  '22023', 'invalid_bounty', 'a start in the past is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500,
    starts_at => now() + interval '1 hour', ends_at => now() - interval '1 minute')$$,
  '22023', 'invalid_bounty', 'an end in the past is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, deadline_at => now() - interval '1 minute')$$,
  '22023', 'invalid_bounty', 'a deadline in the past is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, deadline_at => now() + interval '31 days')$$,
  '22023', 'invalid_bounty', 'a deadline more than 30 days out is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500, starts_at => now() + interval '31 days')$$,
  '22023', 'invalid_bounty', 'a start more than 30 days out is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), 't', 'pickup', 500,
    starts_at => now() + interval '2 days', deadline_at => now() + interval '1 day')$$,
  '22023', 'invalid_bounty', 'a deadline before the start is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), repeat('题', 61), 'pickup', 500)$$,
  '23514', null, 'a 61-character title is rejected by the table'
);
reset role;
select is(pg_temp.totals(), (select v from snapshots where name = 'invalid'), 'rejected publishes write nothing');

insert into public.bounty_applications (bounty_id, applicant_id)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into results select 'close1', public.close_bounty('30000000-0000-0000-0000-000000000001');
reset role;
select is(
  (select r from results where name = 'close1'), '{"status": "closed", "refund": "free"}'::jsonb,
  'closing an open bounty refunds its free post'
);
select is(
  pg_temp.free_left('00000000-0000-0000-0000-0000000000a1')::bigint, (select n - 1 from counts where name = 'a_free'),
  'the free post comes back (one is still used by the second bounty)'
);
select is(
  (select row(b.status::text, e.actor_id, e.from_status::text, e.to_status::text)
   from public.bounties b join public.bounty_events e on e.bounty_id = b.id and e.kind = 'closed'
   where b.id = '30000000-0000-0000-0000-000000000001'),
  row('closed'::text, '00000000-0000-0000-0000-0000000000a1'::uuid, 'open'::text, 'closed'::text),
  'the bounty is closed with a closed event by the poster'
);
select is(
  (select status::text from public.bounty_applications where bounty_id = '30000000-0000-0000-0000-000000000001'),
  'pending', 'a pending application stays pending when the bounty closes'
);
insert into snapshots values ('close_replay', pg_temp.totals());
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  public.close_bounty('30000000-0000-0000-0000-000000000001'), (select r from results where name = 'close1'),
  'closing again returns the first answer'
);
reset role;
select is(pg_temp.totals(), (select v from snapshots where name = 'close_replay'), 'closing again writes nothing');

insert into counts values ('e_before_close', pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5'));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(
  public.close_bounty('30000000-0000-0000-0000-000000000005'), '{"status": "closed", "refund": "coin"}'::jsonb,
  'closing a coin-paid bounty refunds the coin'
);
reset role;
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5')::bigint, (select n + 1 from counts where name = 'e_before_close'),
  'the coin is back'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.close_bounty('30000000-0000-0000-0000-000000000002')$$,
  '42501', 'not_poster', 'only the poster closes a bounty'
);
select throws_ok(
  $$select public.close_bounty(gen_random_uuid())$$, 'P0002', 'bounty_not_found', 'closing an unknown bounty is rejected'
);
reset role;
insert into public.bounties (id, poster_id, helper_id, title, category, reward_sen, expires_at, status)
values
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2',
   '帮取快递', 'pickup', 500, now() + interval '7 days', 'assigned');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.close_bounty('30000000-0000-0000-0000-000000000006')$$,
  '55000', 'invalid_transition', 'an assigned bounty cannot be closed'
);
reset role;

select is(
  private.close_bounty('30000000-0000-0000-0000-000000000002', 'expired'), 'free', 'expiring refunds the charge'
);
select is(
  (select row(b.status::text, e.actor_id) from public.bounties b
   join public.bounty_events e on e.bounty_id = b.id and e.kind = 'expired'
   where b.id = '30000000-0000-0000-0000-000000000002'),
  row('closed'::text, null::uuid), 'an expiry closes the bounty with an expired event and no actor'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.close_bounty('30000000-0000-0000-0000-000000000002')$$,
  '55000', 'invalid_transition', 'the poster closing an expired bounty is not a replay'
);
reset role;
select throws_ok(
  $$select private.close_bounty('30000000-0000-0000-0000-000000000006', 'closed')$$,
  '55000', 'invalid_transition', 'only an open bounty is closed internally'
);
select throws_ok(
  $$select private.close_bounty('30000000-0000-0000-0000-000000000005', 'cancelled')$$,
  '22023', 'invalid_close', 'an internal close is a close or an expiry'
);

select is(
  has_function_privilege('anon', 'public.publish_bounty(uuid, text, public.bounty_category, integer, text, text, double precision, double precision, text, timestamptz, timestamptz, timestamptz)', 'execute'),
  false, 'anon cannot publish'
);
select is(has_function_privilege('anon', 'public.close_bounty(uuid)', 'execute'), false, 'anon cannot close');
select is(
  has_function_privilege('authenticated', 'private.close_bounty(uuid, public.bounty_event_kind)', 'execute'), false,
  'a client cannot call the internal close'
);

select * from finish();
rollback;

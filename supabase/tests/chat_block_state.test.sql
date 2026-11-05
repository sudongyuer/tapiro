begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Dina')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3', 'd4']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.member(viewer text, thread uuid, other text) returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u(viewer));
  select m from jsonb_array_elements(public.read_thread(thread) #> '{thread,members}') m
  where m ->> 'id' = pg_temp.u(other)::text;
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 2);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('b0000000-0000-4000-8000-000000000005', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000005', '我可以');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000005', pg_temp.u('b2'));

create temp table bt as
select t.id from public.threads t where t.bounty_id = 'b0000000-0000-4000-8000-000000000005';
grant select on bt to authenticated;

select pg_temp.act_as(pg_temp.u('a1'));
select public.send_message((select id from bt), gen_random_uuid(), '我到楼下了');

select is(
  pg_temp.member('a1', (select id from bt), 'b2') -> 'blockedByMe', 'false'::jsonb,
  'before any block the peer is not marked blocked'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.block_user(pg_temp.u('a1'));

select is(
  pg_temp.member('b2', (select id from bt), 'a1') -> 'blockedByMe', 'true'::jsonb,
  'the blocker sees the peer as blocked by them'
);
select is(
  pg_temp.member('a1', (select id from bt), 'b2') -> 'blockedByMe', 'false'::jsonb,
  'the blocked side is not told that the peer blocked them'
);

select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  format('select public.send_message(%L, gen_random_uuid(), %L)', (select id from bt), '你下来了吗'),
  '42501', 'blocked', 'the blocked side cannot send in a bounty thread'
);
select is(
  jsonb_array_length(public.read_thread((select id from bt)) -> 'messages'), 1,
  'the blocked side still reads the history'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.unblock_user(pg_temp.u('a1'));
select is(
  pg_temp.member('b2', (select id from bt), 'a1') -> 'blockedByMe', 'false'::jsonb,
  'unblocking clears the mark'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  'a2000000-0000-4000-8000-00000000000a', 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
  now() + interval '3 hours', 6, 'MYR'
);
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride('a2000000-0000-4000-8000-00000000000a');
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride('a2000000-0000-4000-8000-00000000000a');
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-00000000000a', pg_temp.u('c3'), true);
select public.decide_ride_request('a2000000-0000-4000-8000-00000000000a', pg_temp.u('d4'), true);

create temp table rt as
select t.id from public.threads t where t.ride_id = 'a2000000-0000-4000-8000-00000000000a';
grant select on rt to authenticated;

select is(
  (pg_temp.member('c3', (select id from rt), 'a1') ->> 'organiser')
    || (pg_temp.member('c3', (select id from rt), 'd4') ->> 'organiser'),
  'truefalse',
  'a ride member is marked when they organise the ride'
);

select pg_temp.act_as(pg_temp.u('c3'));
select public.block_user(pg_temp.u('d4'));
select is(
  pg_temp.member('c3', (select id from rt), 'd4') -> 'blockedByMe', 'true'::jsonb,
  'a group member the caller blocked is marked, so their messages can be folded'
);
select pg_temp.act_as(pg_temp.u('d4'));
select lives_ok(
  format('select public.send_message(%L, gen_random_uuid(), %L)', (select id from rt), '我晚 5 分钟'),
  'a blocked co-member can still post to the group'
);

select * from finish();
rollback;

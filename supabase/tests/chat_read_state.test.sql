begin;
select plan(27);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3', 'd4']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.c(n integer) returns uuid language sql as $$
  select ('c2000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.send(k text, thread uuid, n integer, body text) returns uuid language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select (public.send_message(thread, pg_temp.c(n), body) ->> 'id')::uuid;
$$;

create function pg_temp.unread(k text) returns integer language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select public.unread_threads();
$$;

create function pg_temp.listed(k text, thread uuid) returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select i from jsonb_array_elements(public.list_threads() -> 'items') i where i ->> 'id' = thread::text;
$$;

create function pg_temp.read_events(k text, thread uuid) returns bigint language sql security definer as $$
  select count(*) from public.events e
  where e.recipient = pg_temp.u(k) and e.kind = 'chat.read' and e.subject_id = thread;
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('b0000000-0000-4000-8000-000000000002', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000002', '我可以');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000002', pg_temp.u('b2'));

create temp table fx as
select t.id as bt from public.threads t where t.bounty_id = 'b0000000-0000-4000-8000-000000000002';
create temp table sent (n integer primary key, id uuid);
grant select on fx, sent to authenticated;

select is(pg_temp.unread('b2'), 0, 'a new thread without messages is not unread');
select is(pg_temp.listed('b2', (select bt from fx)) -> 'lastReadAt', 'null'::jsonb, 'a member has read nothing yet');

insert into sent values (1, pg_temp.send('a1', (select bt from fx), 1, '你好'));
insert into sent values (2, pg_temp.send('a1', (select bt from fx), 2, '我在楼下'));

select is(pg_temp.unread('b2'), 1, 'messages from the other side make the thread unread');
select is(pg_temp.unread('a1'), 0, 'your own messages never make a thread unread');
select is((pg_temp.listed('b2', (select bt from fx)) ->> 'unread')::boolean, true, 'the list row says unread');

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  public.mark_read((select bt from fx), (select id from sent where n = 1)) ->> 'lastReadAt',
  (select to_jsonb(created_at) #>> '{}' from public.messages where id = (select id from sent where n = 1)),
  'marking read answers with the shown message''s time'
);
select is(pg_temp.unread('b2'), 1, 'a later message stays unread until it is shown');
select is(pg_temp.read_events('a1', (select bt from fx)), 1::bigint, 'the other bounty member gets a chat.read event');
select is(pg_temp.read_events('b2', (select bt from fx)), 0::bigint, 'the reader gets no chat.read event');
select is(
  (select push from public.events where kind = 'chat.read' limit 1), false, 'chat.read never pushes'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.mark_read((select bt from fx), (select id from sent where n = 2));
select is(pg_temp.unread('b2'), 0, 'marking the latest message read clears the thread');
select is(
  public.mark_read((select bt from fx), (select id from sent where n = 1)) ->> 'lastReadAt',
  (select to_jsonb(created_at) #>> '{}' from public.messages where id = (select id from sent where n = 2)),
  'marking an older message read never moves the read time back'
);
select is(pg_temp.read_events('a1', (select bt from fx)), 2::bigint, 'a mark that does not advance emits nothing');

select is(
  pg_temp.listed('a1', (select bt from fx)) ->> 'peerReadAt',
  (select to_jsonb(created_at) #>> '{}' from public.messages where id = (select id from sent where n = 2)),
  'the poster sees how far the helper has read in a bounty thread'
);
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.read_thread((select bt from fx)) #>> '{thread,peerReadAt}',
  (select to_jsonb(created_at) #>> '{}' from public.messages where id = (select id from sent where n = 2)),
  'read_thread carries the other side''s read time'
);

select pg_temp.act_as(pg_temp.u('c3'));
select throws_ok(
  format('select public.mark_read(%L, %L)', (select bt from fx), (select id from sent where n = 1)),
  'P0002', 'thread_not_found', 'a non-member cannot mark a thread read'
);
select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  format('select public.mark_read(%L, %L)', (select bt from fx), gen_random_uuid()),
  'P0002', 'message_not_found', 'a message outside the thread is rejected'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  $$select last_read_at from public.thread_members$$, '42501', null, 'members cannot read last_read_at directly'
);
select is(
  (select count(*) from public.thread_members where thread_id = (select bt from fx)), 2::bigint,
  'members still read the other membership columns'
);
reset role;

select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('b2'));
select pg_temp.act_as(pg_temp.u('b2'));
select public.mark_read((select bt from fx), (select id from sent where n = 1));
select is(pg_temp.read_events('a1', (select bt from fx)), 2::bigint, 'a blocked bounty peer gets no chat.read');
select is(
  pg_temp.listed('a1', (select bt from fx)) -> 'peerReadAt', 'null'::jsonb,
  'a blocked bounty peer''s read time is hidden'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.unblock_user(pg_temp.u('b2'));

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  'a2000000-0000-4000-8000-000000000002', 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
  now() + interval '3 hours', 6, 'MYR'
);
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride('a2000000-0000-4000-8000-000000000002');
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride('a2000000-0000-4000-8000-000000000002');
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-000000000002', pg_temp.u('c3'), true);
select public.decide_ride_request('a2000000-0000-4000-8000-000000000002', pg_temp.u('d4'), true);

create temp table rt as
select t.id from public.threads t where t.ride_id = 'a2000000-0000-4000-8000-000000000002';

insert into sent values (3, pg_temp.send('c3', (select id from rt), 3, '我到了'));
select pg_temp.act_as(pg_temp.u('a1'));
select public.mark_read((select id from rt), (select id from sent where n = 3));
select is(pg_temp.read_events('c3', (select id from rt)), 0::bigint, 'reading a ride group emits no chat.read');
select is(
  pg_temp.listed('c3', (select id from rt)) -> 'peerReadAt', 'null'::jsonb, 'a ride group shows nobody''s read time'
);

select pg_temp.act_as(pg_temp.u('d4'));
select public.block_user(pg_temp.u('c3'));
select is(pg_temp.unread('d4'), 0, 'a message from someone you blocked does not make a group unread');
insert into sent values (4, pg_temp.send('a1', (select id from rt), 4, '收到'));
select is(pg_temp.unread('d4'), 1, 'a message from anyone else does');

select pg_temp.act_as(pg_temp.u('c3'));
select public.leave_ride('a2000000-0000-4000-8000-000000000002');
insert into sent values (5, pg_temp.send('a1', (select id from rt), 5, '出发了'));
select pg_temp.act_as(pg_temp.u('c3'));
select public.mark_read((select id from rt), (select id from sent where n = 4));
select is(pg_temp.unread('c3'), 0, 'messages after leaving never make the thread unread');
select pg_temp.act_as(pg_temp.u('c3'));
select throws_ok(
  format('select public.mark_read(%L, %L)', (select id from rt), (select id from sent where n = 5)),
  'P0002', 'message_not_found', 'a member who left cannot mark a message after leaving'
);

select * from finish();
rollback;

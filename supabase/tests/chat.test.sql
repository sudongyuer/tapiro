begin;
select plan(58);

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
  select ('c1000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.bounty_thread(item uuid) returns uuid language sql security definer as $$
  select t.id from public.threads t where t.bounty_id = item;
$$;

create function pg_temp.ride_thread(item uuid) returns uuid language sql security definer as $$
  select t.id from public.threads t where t.ride_id = item;
$$;

create function pg_temp.members(thread uuid) returns uuid[] language sql security definer as $$
  select coalesce(array_agg(m.member_id order by m.member_id), '{}') from public.thread_members m
  where m.thread_id = thread and m.left_at is null;
$$;

create function pg_temp.chat_events(k text, thread uuid) returns bigint language sql security definer as $$
  select count(*) from public.events e
  where e.recipient = pg_temp.u(k) and e.kind = 'chat.message' and e.subject_id = thread;
$$;

create function pg_temp.send(k text, thread uuid, n integer, body text) returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select public.send_message(thread, pg_temp.c(n), body);
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('b0000000-0000-4000-8000-000000000001', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000001', '我可以');
select pg_temp.act_as(pg_temp.u('c3'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000001');

select is(
  pg_temp.bounty_thread('b0000000-0000-4000-8000-000000000001'), null,
  'an open bounty with applicants has no thread (bounty 8A)'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000001', pg_temp.u('b2'));

create temp table fx as select pg_temp.bounty_thread('b0000000-0000-4000-8000-000000000001') as bt;
grant select on fx to authenticated;

select isnt((select bt from fx), null, 'selecting a helper creates the bounty thread');
select is(
  pg_temp.members((select bt from fx)), array[pg_temp.u('a1'), pg_temp.u('b2')],
  'the thread members are the poster and the selected helper only'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000001', pg_temp.u('b2'));
select is(
  (select count(*) from public.threads where bounty_id = 'b0000000-0000-4000-8000-000000000001'), 1::bigint,
  'a repeated select keeps one thread'
);

select is(
  pg_temp.send('a1', (select bt from fx), 1, '  你好，我在楼下  ') - 'id' - 'createdAt',
  jsonb_build_object(
    'threadId', (select bt from fx), 'senderId', pg_temp.u('a1'), 'clientId', pg_temp.c(1), 'body', '你好，我在楼下'
  ),
  'a member sends a text message, trimmed'
);
select is(pg_temp.chat_events('b2', (select bt from fx)), 1::bigint, 'the other member gets one chat.message event');
select is(pg_temp.chat_events('a1', (select bt from fx)), 0::bigint, 'the sender gets no event');
select is(
  (select push from public.events where kind = 'chat.message' limit 1), true, 'chat.message events push'
);

select is(
  pg_temp.send('a1', (select bt from fx), 1, '你好，我在楼下') ->> 'id',
  (select id::text from public.messages where client_id = pg_temp.c(1)),
  'resending the same client id answers with the stored message'
);
select is(
  (select count(*) from public.messages where thread_id = (select bt from fx)), 1::bigint,
  'a resend stores no second message'
);
select is(pg_temp.chat_events('b2', (select bt from fx)), 1::bigint, 'a resend emits no second event');

select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(1), '别的内容'),
  '22023', 'client_id_reused', 'a client id reused for other content is rejected'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(2), '   '),
  '22023', 'invalid_message', 'a blank message is rejected'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(2), repeat('字', 2001)),
  '22023', 'invalid_message', 'a message over 2000 characters is rejected'
);

select pg_temp.send('b2', (select bt from fx), 2, '好的');
select pg_temp.send('a1', (select bt from fx), 3, '到了吗');

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  jsonb_array_length(public.list_threads() -> 'items'), 1, 'the helper lists one thread'
);
select is(
  (public.list_threads() #> '{items,0}') - 'createdAt' - 'lastMessage',
  jsonb_build_object(
    'id', (select bt from fx), 'kind', 'bounty', 'itemId', 'b0000000-0000-4000-8000-000000000001', 'left', false,
    'members', jsonb_build_array(jsonb_build_object('id', pg_temp.u('a1'), 'name', 'Alice', 'avatarUrl', null, 'left', false))
  ),
  'a listed thread names its item and the other members'
);
select is(public.list_threads() #>> '{items,0,lastMessage,body}', '到了吗', 'a listed thread carries its latest message');

select is(
  (select array_agg(m ->> 'body') from jsonb_array_elements(public.read_thread((select bt from fx), max_count => 2) -> 'messages') m),
  array['到了吗', '好的'], 'a thread reads newest first, one page at a time'
);
select is(
  (public.read_thread((select bt from fx), max_count => 2) ->> 'hasMore')::boolean, true, 'a full page says there is more'
);
select is(
  public.read_thread(
    (select bt from fx), (select id from public.messages where client_id = pg_temp.c(2)), 2
  ) #>> '{messages,0,body}',
  '你好，我在楼下', 'the next page starts before the cursor'
);

select pg_temp.act_as(pg_temp.u('c3'));
select is(jsonb_array_length(public.list_threads() -> 'items'), 0, 'a not-selected applicant lists no thread');
select throws_ok(
  format('select public.read_thread(%L)', (select bt from fx)),
  'P0002', 'thread_not_found', 'a non-member cannot read the thread'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(4), '我也想聊'),
  'P0002', 'thread_not_found', 'a non-member cannot send'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is((select count(*) from public.messages), 0::bigint, 'RLS hides messages from non-members');
select is((select count(*) from public.threads), 0::bigint, 'RLS hides threads from non-members');
select is((select count(*) from public.thread_members), 0::bigint, 'RLS hides memberships from non-members');
select pg_temp.act_as(pg_temp.u('b2'));
select is((select count(*) from public.messages), 3::bigint, 'a member reads the thread messages directly');
select is((select count(*) from public.thread_members), 2::bigint, 'a member sees the thread members');
select throws_ok(
  format(
    $$insert into public.messages (thread_id, sender_id, client_id, body) values (%L, %L, %L, 'x')$$,
    (select bt from fx), pg_temp.u('b2'), pg_temp.c(9)
  ),
  '42501', null, 'members cannot insert messages directly'
);
select throws_ok(
  $$update public.messages set body = 'edited'$$, '42501', null, 'members cannot edit messages directly'
);
select throws_ok(
  format($$insert into public.threads (bounty_id) values (%L)$$, 'b0000000-0000-4000-8000-000000000001'),
  '42501', null, 'clients cannot create threads'
);
reset role;

select pg_temp.act_as(pg_temp.u('b2'));
select public.block_user(pg_temp.u('a1'));
select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(5), '在吗'),
  '42501', 'blocked', 'the blocked side cannot send in a bounty thread'
);
select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(6), '在吗'),
  '42501', 'blocked', 'the blocking side cannot send either'
);
select is(
  jsonb_array_length(public.read_thread((select bt from fx)) -> 'messages'), 3, 'a blocked pair still reads its history'
);
select public.unblock_user(pg_temp.u('a1'));
select lives_ok(
  format('select public.send_message(%L, %L, %L)', (select bt from fx), pg_temp.c(6), '在吗'),
  'sending works again after unblocking'
);

select pg_temp.act_as(pg_temp.u('b2'));
create temp table rp as
select public.report(null, (select id from public.messages where client_id = pg_temp.c(3)), 'off_platform_payment', '  要我先转定金  ') ->> 'id' as id;
grant select on rp to authenticated;
select is(
  (select row(reporter_id, target_id, thread_id, reason, note, message_body)::text from public.reports where id::text = (select id from rp)),
  row(pg_temp.u('b2'), pg_temp.u('a1'), (select bt from fx), 'off_platform_payment', '要我先转定金', '到了吗')::text,
  'a message report snapshots the sender, thread and body'
);
select is(
  public.report(null, (select id from public.messages where client_id = pg_temp.c(3)), 'off_platform_payment') ->> 'id',
  (select id from rp), 'reporting the same message again answers with the first report'
);
select lives_ok(
  format('select public.report(%L)', pg_temp.u('a1')), 'a person can be reported without a message or reason'
);
select throws_ok(
  format('select public.report(null, %L)', (select id from public.messages where client_id = pg_temp.c(2))),
  '22023', 'cannot_report_self', 'nobody reports their own message'
);
select throws_ok(
  format('select public.report(%L, %L)', pg_temp.u('c3'), (select id from public.messages where client_id = pg_temp.c(3))),
  '22023', 'invalid_report', 'a message report cannot name someone other than the sender'
);
select throws_ok(
  format('select public.report(%L, null, %L)', pg_temp.u('a1'), 'spam'),
  '22023', 'invalid_report', 'an unknown reason is rejected'
);
select pg_temp.act_as(pg_temp.u('c3'));
select throws_ok(
  format('select public.report(null, %L)', (select id from public.messages where client_id = pg_temp.c(3))),
  'P0002', 'message_not_found', 'a non-member cannot report a message they cannot read'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok($$select count(*) from public.reports$$, '42501', null, 'the reporter cannot read reports');
select throws_ok($$update public.reports set note = 'x'$$, '42501', null, 'the reporter cannot edit reports');
select throws_ok($$delete from public.reports$$, '42501', null, 'the reporter cannot delete reports');
select throws_ok($$select count(*) from private.report_queue$$, '42501', null, 'clients cannot read the report queue');
reset role;

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  'a2000000-0000-4000-8000-000000000001', 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
  now() + interval '3 hours', 6, 'MYR'
);
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride('a2000000-0000-4000-8000-000000000001');
select is(pg_temp.ride_thread('a2000000-0000-4000-8000-000000000001'), null, 'a ride with only requests has no thread');

select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-000000000001', pg_temp.u('c3'), true);
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride('a2000000-0000-4000-8000-000000000001');
select pg_temp.act_as(pg_temp.u('e5'));
select public.request_ride('a2000000-0000-4000-8000-000000000001');
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-000000000001', pg_temp.u('d4'), true);
select public.decide_ride_request('a2000000-0000-4000-8000-000000000001', pg_temp.u('e5'), false);

create temp table rt as select pg_temp.ride_thread('a2000000-0000-4000-8000-000000000001') as id;
select is(
  pg_temp.members((select id from rt)), array[pg_temp.u('a1'), pg_temp.u('c3'), pg_temp.u('d4')],
  'accepting riders builds one group thread of the organiser and accepted members'
);

select pg_temp.send('d4', (select id from rt), 10, '我在 Geo 门口');
select is(
  array[pg_temp.chat_events('a1', (select id from rt)), pg_temp.chat_events('c3', (select id from rt)),
    pg_temp.chat_events('d4', (select id from rt)), pg_temp.chat_events('e5', (select id from rt))],
  array[1, 1, 0, 0]::bigint[], 'a group message reaches each other member once, and not the declined requester'
);

select pg_temp.act_as(pg_temp.u('c3'));
select public.block_user(pg_temp.u('d4'));
select lives_ok(
  format('select public.send_message(%L, %L, %L)', (select id from rt), pg_temp.c(11), '收到'),
  'a block between co-members does not stop group sending'
);
select is(
  array[pg_temp.chat_events('a1', (select id from rt)), pg_temp.chat_events('d4', (select id from rt))],
  array[2, 0]::bigint[], 'a blocked co-member gets no event for the blocker''s message'
);
select public.unblock_user(pg_temp.u('d4'));

select public.leave_ride('a2000000-0000-4000-8000-000000000001');
select pg_temp.send('a1', (select id from rt), 12, '人齐了');
select is(pg_temp.chat_events('c3', (select id from rt)), 1::bigint, 'a rider who left gets no further events');
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select array_agg(m ->> 'body') from jsonb_array_elements(public.read_thread((select id from rt)) -> 'messages') m),
  array['收到', '我在 Geo 门口'], 'a rider who left reads the history up to leaving'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select id from rt), pg_temp.c(13), '我回来了'),
  '42501', 'not_member', 'a rider who left cannot send'
);

update public.bounties set status = 'cancelled' where id = 'b0000000-0000-4000-8000-000000000001';
delete from auth.users where id = pg_temp.u('b2');
select is(
  (select array_agg(body order by created_at) from public.messages where thread_id = (select bt from fx)),
  array['你好，我在楼下', '到了吗'], 'deleting an account removes its messages and keeps the other side''s'
);
select is(
  pg_temp.members((select bt from fx)), array[pg_temp.u('a1')], 'the other side keeps the thread'
);
select is(
  (select row(reporter_id, target_id, message_body)::text from public.reports where id::text = (select id from rp)),
  row(null::uuid, pg_temp.u('a1'), '到了吗')::text, 'a report survives its reporter''s deletion without their id'
);
select is(
  (select count(*) from public.events where recipient = pg_temp.u('b2')), 0::bigint, 'the deleted user''s events are gone'
);

select * from finish();
rollback;

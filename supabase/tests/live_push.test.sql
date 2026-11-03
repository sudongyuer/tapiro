begin;
select plan(84);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['d4', 'e5']) k;
insert into public.payee_methods (user_id, type, phone, display_name)
values ('00000000-0000-0000-0000-0000000000b2', 'duitnow_id', '+60123456789', 'BOB');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('43000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.publish(n integer) returns void language plpgsql as $$
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_bounty(pg_temp.b(n), '帮取快递', 'pickup', 500, 'MYR');
end;
$$;

create function pg_temp.apply(n integer, k text) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select public.apply_to_bounty(pg_temp.b(n));
$$;

create function pg_temp.kinds(k text, subject uuid) returns text[] language sql security definer as $$
  select coalesce(array_agg(e.kind order by e.id), '{}') from public.events e
  where e.recipient = pg_temp.u(k) and e.subject_id = subject;
$$;

create function pg_temp.pushed(k text, kind text) returns boolean language sql security definer as $$
  select bool_and(e.push) from public.events e where e.recipient = pg_temp.u(k) and e.kind = pushed.kind;
$$;

select pg_temp.publish(1);
select is(pg_temp.kinds('a1', pg_temp.b(1)), '{}'::text[], 'publishing a bounty tells nobody');

select pg_temp.apply(1, 'b2');
select is(pg_temp.kinds('a1', pg_temp.b(1)), '{bounty.applied}'::text[], 'an application reaches the poster');
select is(pg_temp.kinds('b2', pg_temp.b(1)), '{}'::text[], 'the applicant is not told of their own application');
select ok(pg_temp.pushed('a1', 'bounty.applied'), 'a new applicant pushes (must act)');

select pg_temp.apply(1, 'd4');
select public.withdraw_application(pg_temp.b(1));
select ok('bounty.withdrawn' = any (pg_temp.kinds('a1', pg_temp.b(1))), 'a withdrawal reaches the poster');
select ok(not pg_temp.pushed('a1', 'bounty.withdrawn'), 'a withdrawal is live only');

select pg_temp.apply(1, 'e5');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper(pg_temp.b(1), pg_temp.u('b2'));
select is(pg_temp.kinds('b2', pg_temp.b(1)), '{bounty.selected}'::text[], 'the chosen helper is told');
select ok(pg_temp.pushed('b2', 'bounty.selected'), 'being chosen pushes (must act)');
select is(pg_temp.kinds('e5', pg_temp.b(1)), '{bounty.not_selected}'::text[], 'the other pending applicant is told');
select ok(not pg_temp.pushed('e5', 'bounty.not_selected'), 'not being chosen is live only');
select is(pg_temp.kinds('d4', pg_temp.b(1)), '{}'::text[], 'an applicant who withdrew hears nothing more');

select pg_temp.act_as(pg_temp.u('b2'));
select public.start_bounty(pg_temp.b(1), now() + interval '20 minutes');
select public.update_eta(pg_temp.b(1), now() + interval '30 minutes');
select public.complete_bounty(pg_temp.b(1));
select is(
  pg_temp.kinds('a1', pg_temp.b(1)),
  '{bounty.applied,bounty.applied,bounty.withdrawn,bounty.applied,bounty.started,bounty.eta_changed,bounty.completed}'::text[],
  'set off, a new ETA and 完成 reach the poster'
);
select ok(
  pg_temp.pushed('a1', 'bounty.started') and pg_temp.pushed('a1', 'bounty.eta_changed')
    and pg_temp.pushed('a1', 'bounty.completed'),
  'the poster is waiting, so all three push'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.report_bounty_problem(pg_temp.b(1), '没看到东西');
select ok('bounty.issue' = any (pg_temp.kinds('b2', pg_temp.b(1))), 'a reported problem reaches the helper');
select ok(pg_temp.pushed('b2', 'bounty.issue'), 'a reported problem pushes');

select pg_temp.act_as(pg_temp.u('b2'));
select public.complete_bounty(pg_temp.b(1));
select pg_temp.act_as(pg_temp.u('a1'));
select public.confirm_bounty(pg_temp.b(1));
select is(
  pg_temp.kinds('b2', pg_temp.b(1)), '{bounty.selected,bounty.issue,bounty.confirmed}'::text[],
  'the confirmation reaches the helper'
);
select ok(not pg_temp.pushed('b2', 'bounty.confirmed'), 'a confirmation is live only');

create temp table fx (name text primary key, id uuid not null);
insert into fx select 'pay', p.id from public.payments p where p.item_kind = 'bounty' and p.item_id = pg_temp.b(1);

select public.mark_payment_paid(
  (select id from fx where name = 'pay'), (select id from public.payee_methods where user_id = pg_temp.u('b2')), 500
);
select is(
  pg_temp.kinds('b2', (select id from fx where name = 'pay')), '{payment.marked_paid}'::text[],
  '我已付款 on a bounty payment reaches the payee'
);
select pg_temp.act_as(pg_temp.u('b2'));
select public.report_not_received((select id from fx where name = 'pay'));
select is(
  pg_temp.kinds('a1', (select id from fx where name = 'pay')), '{payment.not_received}'::text[],
  '还没收到 reaches the payer'
);
select public.confirm_payment_received((select id from fx where name = 'pay'));
select is(
  pg_temp.kinds('a1', (select id from fx where name = 'pay')), '{payment.not_received,payment.settled}'::text[],
  'the settlement reaches the payer'
);
select ok(not pg_temp.pushed('a1', 'payment.settled'), 'a settlement is live only');
select is(
  (select q.thread_id from public.push_queue q where q.kind = 'payment.marked_paid' and q.recipient = pg_temp.u('b2')),
  'bounty:' || pg_temp.b(1), 'a bounty payment push is grouped with its bounty'
);
select is(
  (select q.thread_id from public.push_queue q where q.kind = 'bounty.applied' limit 1),
  'bounty:' || pg_temp.b(1), 'bounty pushes are grouped per bounty'
);
select is(
  (select count(*) from public.push_queue q join public.events e on e.id = q.event_id where not e.push),
  0::bigint, 'live-only events queue no push'
);

select pg_temp.publish(2);
select pg_temp.apply(2, 'b2');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper(pg_temp.b(2), pg_temp.u('b2'));
select pg_temp.act_as(pg_temp.u('b2'));
select public.cancel_bounty(pg_temp.b(2));
select is(
  pg_temp.kinds('a1', pg_temp.b(2)), '{bounty.applied,bounty.cancelled}'::text[], 'a helper''s cancel reaches the poster'
);
select is(pg_temp.kinds('b2', pg_temp.b(2)), '{bounty.selected}'::text[], 'the canceller is not told');

select pg_temp.publish(3);
select pg_temp.apply(3, 'b2');
select pg_temp.apply(3, 'd4');
select pg_temp.apply(3, 'e5');
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('e5'), pg_temp.u('a1'));
select pg_temp.act_as(pg_temp.u('a1'));
select public.close_bounty(pg_temp.b(3));
select ok(
  pg_temp.kinds('b2', pg_temp.b(3)) = '{bounty.cancelled}' and pg_temp.kinds('d4', pg_temp.b(3)) = '{bounty.cancelled}',
  'closing an open bounty reaches its pending applicants'
);
select ok(pg_temp.pushed('d4', 'bounty.cancelled'), 'a cancellation pushes');
select is(pg_temp.kinds('e5', pg_temp.b(3)), '{}'::text[], 'an applicant blocked from the poster is not told');
delete from public.blocks where blocker_id = pg_temp.u('e5');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values (pg_temp.u('f6'), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f6@example.com',
  '{"full_name":"Fay"}');
insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('f6'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('f6'));
select public.publish_bounty(pg_temp.b(5), '帮买早餐', 'pickup', 500, 'MYR');
select pg_temp.apply(5, 'd4');
delete from auth.users where id = pg_temp.u('f6');
select is(
  pg_temp.kinds('d4', pg_temp.b(5)), '{bounty.cancelled}'::text[],
  'a bounty closed by its poster''s account deletion reaches its pending applicants'
);

select pg_temp.publish(4);
select private.run_bounty_jobs(now() + interval '30 days');
select is(pg_temp.kinds('a1', pg_temp.b(4)), '{bounty.expired}'::text[], 'an expired bounty reaches the poster');
select ok(not pg_temp.pushed('a1', 'bounty.expired'), 'an expiry is live only');

select is(
  (select m.payload - 'at' from realtime.messages m
   where m.topic = 'user:' || pg_temp.u('a1') and m.event = 'bounty.expired'),
  jsonb_build_object('kind', 'bounty.expired', 'id', pg_temp.b(4)),
  'each event is broadcast to the recipient''s topic as a signal with ids only'
);
select ok(
  (select bool_and(m.private and m.extension = 'broadcast' and m.payload ? 'at') from realtime.messages m
   where m.topic like 'user:%'),
  'signals go out on private broadcast channels with their time'
);
select is(
  (select count(*) from realtime.messages m where m.topic like 'user:%' and m.topic <> 'user:' || pg_temp.u('f6')),
  (select count(*) from public.events), 'every event row is broadcast once'
);

select public.register_push_token('ExponentPushToken[aaa]', 'en');
select pg_temp.act_as(pg_temp.u('a1'));
select public.register_push_token('ExponentPushToken[aaa]', 'ms');
select is(
  (select array[t.user_id::text, t.language] from public.push_tokens t where t.token = 'ExponentPushToken[aaa]'),
  array[pg_temp.u('a1')::text, 'ms'], 'a token registered again moves to the signed-in user'
);
select throws_ok(
  $$select public.register_push_token('not-a-token', 'en')$$, '22023', 'invalid_push_token', 'a malformed token is refused'
);
select throws_ok(
  $$select public.register_push_token('ExponentPushToken[bbb]', 'fr')$$, '22023', 'invalid_language',
  'an unsupported language is refused'
);
select public.register_push_token('ExpoPushToken[a' || n || ']', 'zh-Hans') from generate_series(1, 11) n;
select is(
  (select count(*) from public.push_tokens t where t.user_id = pg_temp.u('a1')), 10::bigint,
  'a user keeps at most ten tokens, the newest'
);
select is(public.set_push_language('en'), 10, 'a language change updates every token of the user');
select pg_temp.act_as(pg_temp.u('b2'));
select public.register_push_token('ExponentPushToken[bob]', 'zh-Hans');
select pg_temp.act_as(pg_temp.u('a1'));
select public.unregister_push_token('ExponentPushToken[bob]');
select ok(
  exists (select 1 from public.push_tokens t where t.token = 'ExponentPushToken[bob]'),
  'a user cannot remove another user''s token'
);
select pg_temp.act_as(pg_temp.u('b2'));
select public.unregister_push_token('ExponentPushToken[bob]');
select ok(
  not exists (select 1 from public.push_tokens t where t.token = 'ExponentPushToken[bob]'), 'sign-out removes the token'
);
select public.register_push_token('ExponentPushToken[bob]', 'zh-Hans');

insert into public.events (recipient, kind, subject_id, push, created_at)
values
  (pg_temp.u('a1'), 'bounty.applied', pg_temp.b(1), true, '2099-01-01 17:00+00'),
  (pg_temp.u('b2'), 'payment.marked_paid', (select id from fx where name = 'pay'), true, '2099-01-01 17:00+00');
select is(
  (select array_agg(array[q.thread_id, q.quiet::text, q.send_at::text] order by q.kind) from public.push_queue q
   where q.send_at > '2090-01-01'),
  array[
    array['bounty:' || pg_temp.b(1), 'true', '2099-01-02 00:00:00+00'],
    array['bounty:' || pg_temp.b(1), 'true', '2099-01-02 00:00:00+00']
  ], 'a bounty push and a bounty payment push at 01:00 Malaysia time wait for 08:00'
);
insert into private.event_kinds (kind, push) values ('other.thing', true);
select lives_ok(
  $$insert into public.events (recipient, kind, subject_id, push) values (pg_temp.u('a1'), 'other.thing', pg_temp.b(1), true)$$,
  'a push kind without a thread rule never fails the transition'
);
select is(
  (select count(*) from public.push_queue q where q.kind = 'other.thing'), 0::bigint,
  'a push kind without a thread rule is not queued'
);

update public.push_queue set send_at = now() - interval '1 minute', quiet = false
where quiet and send_at < '2090-01-01';
update public.push_queue set send_at = now() + interval '8 hours', quiet = true
where kind = 'bounty.cancelled' and recipient = pg_temp.u('d4') and subject_id = pg_temp.b(3);
create temp table claim as select x from jsonb_array_elements(public.claim_due_pushes(500)) x;
select is(
  (select count(*) from claim), (select count(*) - 3 from public.push_queue), 'a claim takes every due push'
);
select ok(
  not exists (
    select 1 from claim c join public.push_queue q on q.id = (c.x ->> 'queueId')::bigint
    where (q.recipient = pg_temp.u('d4') and q.kind = 'bounty.cancelled' and q.subject_id = pg_temp.b(3))
      or q.send_at > '2090-01-01'
  ),
  'a push held by quiet hours is not claimed'
);
select is(
  (select x - 'queueId' from claim where x ->> 'kind' = 'bounty.selected' and x ->> 'subjectId' = pg_temp.b(1)::text),
  jsonb_build_object(
    'kind', 'bounty.selected', 'subjectId', pg_temp.b(1), 'threadId', 'bounty:' || pg_temp.b(1), 'actorName', 'Alice',
    'subject', jsonb_build_object('title', '帮取快递'),
    'tokens', jsonb_build_array(jsonb_build_object('token', 'ExponentPushToken[bob]', 'language', 'zh-Hans'))
  ),
  'a claimed push carries the copy inputs and the recipient''s tokens and languages'
);
select is(
  (select x -> 'subject' from claim where x ->> 'kind' = 'payment.marked_paid'),
  jsonb_build_object('title', '帮取快递'), 'a payment push carries the payment title'
);
select is(
  jsonb_array_length(public.claim_due_pushes(500)), 0, 'a claimed push is not claimed again while it is being sent'
);

create temp table picked as
select (x ->> 'queueId')::bigint as id from claim where x ->> 'kind' = 'bounty.selected' and x ->> 'subjectId' = pg_temp.b(1)::text;
select public.finish_push((select id from picked), null);
select ok(
  (select q.sent_at is not null from public.push_queue q where q.id = (select id from picked)),
  'a sent push is marked sent'
);
create temp table failing as
select (x ->> 'queueId')::bigint as id from claim where x ->> 'kind' = 'bounty.issue';
select public.finish_push((select id from failing), 'MessageRateExceeded');
select is(
  (select (x ->> 'queueId')::bigint from jsonb_array_elements(public.claim_due_pushes(500)) x),
  (select id from failing), 'a failed push is retried once'
);
select public.finish_push((select id from failing), 'MessageRateExceeded');
select ok(
  (select q.failed_at is not null and q.sent_at is null from public.push_queue q where q.id = (select id from failing)),
  'after the retry fails the push stops'
);
select is(
  (select e.push_error from public.events e join public.push_queue q on q.event_id = e.id
   where q.id = (select id from failing)),
  'MessageRateExceeded', 'the event keeps the push error'
);
select is(jsonb_array_length(public.claim_due_pushes(500)), 0, 'a stopped push is not claimed again');

create function pg_temp.claimed(kind text, subject uuid) returns bigint language sql as $$
  select (x ->> 'queueId')::bigint from claim where x ->> 'kind' = claimed.kind and x ->> 'subjectId' = subject::text;
$$;
create function pg_temp.event_error(queue bigint) returns text language sql as $$
  select e.push_error from public.events e join public.push_queue q on q.event_id = e.id where q.id = queue;
$$;

select public.finish_push(pg_temp.claimed('bounty.started', pg_temp.b(1)), 'MessageRateExceeded');
select is(
  (select (x ->> 'queueId')::bigint from jsonb_array_elements(public.claim_due_pushes(500)) x),
  pg_temp.claimed('bounty.started', pg_temp.b(1)), 'a push that failed once is claimed for its retry'
);
select public.finish_push(pg_temp.claimed('bounty.started', pg_temp.b(1)), null);
select ok(
  pg_temp.event_error(pg_temp.claimed('bounty.started', pg_temp.b(1))) is null
    and (select q.sent_at is not null from public.push_queue q where q.id = pg_temp.claimed('bounty.started', pg_temp.b(1))),
  'a retry that succeeds is sent and clears the earlier error'
);

select public.finish_push(pg_temp.claimed('bounty.eta_changed', pg_temp.b(1)), 'no_copy');
select public.finish_push(
  pg_temp.claimed('payment.not_received', (select id from fx where name = 'pay')), 'no_device'
);
select ok(
  (select bool_and(q.failed_at is not null and q.attempts = 1) from public.push_queue q
   where q.id in (
     pg_temp.claimed('bounty.eta_changed', pg_temp.b(1)),
     pg_temp.claimed('payment.not_received', (select id from fx where name = 'pay'))
   )),
  'no copy and no device are final on the first attempt'
);
select is(
  pg_temp.event_error(pg_temp.claimed('payment.not_received', (select id from fx where name = 'pay'))), 'no_device',
  'a recipient without a device is recorded as no_device, not as sent'
);
select is(jsonb_array_length(public.claim_due_pushes(500)), 0, 'final outcomes are not claimed again');

update public.push_queue set claimed_at = now() - interval '6 minutes'
where id = pg_temp.claimed('bounty.selected', pg_temp.b(2));
select is(
  (select array_agg((x ->> 'queueId')::bigint) from jsonb_array_elements(public.claim_due_pushes(500)) x),
  array[pg_temp.claimed('bounty.selected', pg_temp.b(2))],
  'a claim left unfinished for five minutes is claimed again for its second attempt'
);
update public.push_queue set claimed_at = now() - interval '6 minutes'
where id = pg_temp.claimed('bounty.selected', pg_temp.b(2));
select is(jsonb_array_length(public.claim_due_pushes(500)), 0, 'a second unfinished claim is not sent again');
select ok(
  (select q.failed_at is not null and q.sent_at is null from public.push_queue q
   where q.id = pg_temp.claimed('bounty.selected', pg_temp.b(2)))
    and pg_temp.event_error(pg_temp.claimed('bounty.selected', pg_temp.b(2))) = 'stalled',
  'a second unfinished claim fails as stalled'
);

select public.finish_push(pg_temp.claimed('bounty.selected', pg_temp.b(1)), 'MessageRateExceeded');
select ok(
  (select q.sent_at is not null and q.failed_at is null from public.push_queue q
   where q.id = pg_temp.claimed('bounty.selected', pg_temp.b(1)))
    and pg_temp.event_error(pg_temp.claimed('bounty.selected', pg_temp.b(1))) is null,
  'a late failure report does not undo a sent push'
);
select public.finish_push(pg_temp.claimed('bounty.selected', pg_temp.b(2)), null);
select ok(
  (select q.sent_at is null and q.failed_at is not null from public.push_queue q
   where q.id = pg_temp.claimed('bounty.selected', pg_temp.b(2)))
    and pg_temp.event_error(pg_temp.claimed('bounty.selected', pg_temp.b(2))) = 'stalled',
  'a late success report does not revive a failed push'
);

create temp table stuck as
select q.id from public.push_queue q where q.kind = 'bounty.applied' and q.send_at > '2090-01-01';
update public.push_queue set attempts = 2, claimed_at = now() - interval '6 minutes', send_at = now() - interval '1 hour'
where id = (select id from stuck);
select private.drain_due_pushes();
select ok(
  (select q.failed_at is not null from public.push_queue q where q.id = (select id from stuck))
    and pg_temp.event_error((select id from stuck)) = 'stalled',
  'the five-minute drain marks a push stuck after its second attempt as stalled, with no other traffic'
);
select public.drop_push_token('ExponentPushToken[bob]');
select ok(
  not exists (select 1 from public.push_tokens t where t.token = 'ExponentPushToken[bob]'),
  'the server drops a token Expo reports as not registered'
);

create function pg_temp.denied(who text) returns setof text language sql as $$
  select throws_ok($q$select public.claim_due_pushes(10)$q$, '42501', null, who || ' clients cannot claim pushes')
  union all
  select throws_ok($q$select public.finish_push(1, null)$q$, '42501', null, who || ' clients cannot finish pushes')
  union all
  select throws_ok(
    $q$select public.drop_push_token('ExponentPushToken[aaa]')$q$, '42501', null, who || ' clients cannot drop tokens'
  )
  union all
  select throws_ok(
    $q$select public.call_edge_function('notify')$q$, '42501', null, who || ' clients cannot call notify'
  );
$$;
grant execute on function pg_temp.denied(text) to authenticated, anon;

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select set_config('realtime.topic', 'user:' || pg_temp.u('a1'), true);
select ok(
  (select count(*) from realtime.messages where topic = 'user:' || pg_temp.u('a1')) > 0,
  'a user receives signals on their own topic'
);
select is(
  (select count(*) from realtime.messages where topic <> 'user:' || pg_temp.u('a1')), 0::bigint,
  'joined to their own topic, a user sees no other topic''s rows'
);
select set_config('realtime.topic', 'user:' || pg_temp.u('b2'), true);
select is((select count(*) from realtime.messages), 0::bigint, 'a user cannot join another user''s topic');
select throws_ok($$select count(*) from public.events$$, '42501', null, 'clients cannot read events');
select throws_ok($$select count(*) from public.push_tokens$$, '42501', null, 'clients cannot read push tokens');
select throws_ok($$select count(*) from public.recorded_pushes$$, '42501', null, 'clients cannot read recorded pushes');
select throws_ok(
  $$insert into realtime.messages (topic, extension, payload, event, private)
    values ('user:' || pg_temp.u('b2'), 'broadcast', '{}', 'bounty.selected', true)$$,
  '42501', null, 'clients cannot send signals'
);
select pg_temp.denied('signed-in');
reset role;
set local role anon;
select set_config('realtime.topic', 'user:' || pg_temp.u('a1'), true);
select is((select count(*) from realtime.messages), 0::bigint, 'a signed-out client receives no signals');
select pg_temp.denied('signed-out');
select throws_ok(
  $$select public.register_push_token('ExponentPushToken[anon]', 'en')$$, '42501', null,
  'a signed-out client cannot register a token'
);

select * from finish();
rollback;

begin;
select plan(58);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli'), ('f6', 'Fai')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');
insert into public.coin_ledger (user_id, reason, delta)
values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 20);

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('20000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.publish(
  n integer, departs interval default interval '3 hours', seat_count integer default 4, note text default null
) returns jsonb language sql as $$
  select public.publish_ride(
    pg_temp.r(n), 'Sunway Geo Residences', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
    date_trunc('second', now()) + departs, seat_count, 'MYR', 'tapiro', 7600, null, null, note
  );
$$;

create function pg_temp.as_user(k text, statement text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(pg_temp.u(k));
  execute 'select ' || statement into answer;
  return answer;
end;
$$;

create function pg_temp.member_status(n integer, k text) returns text language sql as $$
  select status::text from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.backdate(n integer, departs interval) returns void language sql as $$
  update public.rides set depart_at = now() + departs where id = pg_temp.r(n);
$$;

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));

select is(pg_temp.publish(1, note => 'Geo 大堂门口') - 'id', '{"status": "open", "charge": "free"}'::jsonb, 'the first publish uses a free post');
select is(pg_temp.member_status(1, 'a1'), 'accepted', 'the organiser holds one of the seats');
select is(
  (select array[start_kind::text, dest_kind::text] from public.rides where id = pg_temp.r(1)),
  array['home', 'airport'], 'place kinds come from the short-name table'
);
select is(
  (select meeting_note from public.ride_details where ride_id = pg_temp.r(1)), 'Geo 大堂门口', 'the meeting note is stored'
);
reset role;
select is(
  (select array_agg(kind::text) from public.ride_events where ride_id = pg_temp.r(1)), array['published'],
  'publishing is logged'
);
create temp table replay as select count(*) as n from public.post_charges;
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.publish_ride(
    pg_temp.r(1), 'Sunway Geo Residences', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
    (select depart_at from public.rides where id = pg_temp.r(1)), 4, 'MYR', 'tapiro', 7600, null, null, 'Geo 大堂门口'
  ) - 'id',
  '{"status": "open", "charge": "free"}'::jsonb, 'a replay with the same content answers the first outcome'
);
reset role;
select is((select count(*) from public.post_charges), (select n from replay), 'a replay charges nothing');
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  $$select pg_temp.publish(1, interval '4 hours')$$, '55000', 'post_already_sent',
  'a replay with different content is refused'
);
select throws_ok($$select pg_temp.publish(90, interval '-1 minute')$$, '22023', 'invalid_ride', 'a past departure is refused');
select throws_ok($$select pg_temp.publish(90, interval '31 days')$$, '22023', 'invalid_ride', 'more than 30 days ahead is refused');
select throws_ok($$select pg_temp.publish(90, seat_count => 7)$$, '22023', 'invalid_ride', 'seven seats are refused');
select throws_ok($$select pg_temp.publish(90, seat_count => 1)$$, '22023', 'invalid_ride', 'one seat is refused');
select throws_ok(
  $$select public.publish_ride(pg_temp.r(90), 'Sunway Geo', '123456789', 3.07, 101.6, 'KLIA2', 'KLIA2', 2.7, 101.7, now() + interval '3 hours', 4, 'MYR')$$,
  '22023', 'invalid_ride', 'a nine-character short name is refused'
);
select throws_ok(
  $$select public.publish_ride(pg_temp.r(90), 'Sunway Geo', '双威', 3.07, 101.6, 'KLIA2', 'KLIA2', 2.7, 101.7, now() + interval '3 hours', 4, 'MYR', estimate_minor => 50)$$,
  '22023', 'invalid_ride', 'an estimate below the ride limit is refused'
);
select throws_ok(
  $$select public.publish_ride(pg_temp.r(90), 'Sunway Geo', '双威', 3.07, 101.6, 'KLIA2', 'KLIA2', 2.7, 101.7, now() + interval '3 hours', 4, 'MYR', flight_departs_at => now() + interval '2 hours')$$,
  '22023', 'invalid_ride', 'a flight before the departure is refused'
);
select throws_ok(
  $$select public.publish_ride(pg_temp.r(90), 'Sunway Geo', '双威', 3.07, 101.6, 'KLIA2', 'KLIA2', 2.7, 101.7, now() + interval '3 hours', 4, 'MYR', large_bags => 10)$$,
  '22023', 'invalid_ride', 'ten large bags are refused'
);
select throws_ok(
  $$select public.publish_ride(pg_temp.r(90), 'Sunway Geo', '双威', 3.07, 101.6, 'KLIA2', 'KLIA2', 2.7, 101.7, now() + interval '3 hours', 4, 'XXX')$$,
  '22023', 'invalid_ride', 'an unknown currency is refused'
);
select is(pg_temp.publish(2, interval '20 minutes') ->> 'status', 'gathering', 'a ride leaving within 30 minutes starts at 集合');

select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok($$select pg_temp.publish(91)$$, '55000', 'no_payee_method', 'publishing needs a payee method, even for Grab split');
reset role;
select is((select count(*) from public.post_charges where item_id = pg_temp.r(91)), 0::bigint, 'a refused publish charges nothing');
insert into public.payee_methods (user_id, type) values (pg_temp.u('b2'), 'cash');
insert into public.payments (item_kind, item_id, title, payer_id, payee_id, amount_minor, currency, reference, created_at)
values ('bounty', gen_random_uuid(), '欠款', pg_temp.u('b2'), pg_temp.u('d4'), 500, 'MYR', 'TP-AAAA', now() - interval '8 days');
set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok($$select pg_temp.publish(91)$$, '55000', 'publish_blocked', 'publishing is blocked while a debt is 7 days old');

select is(pg_temp.as_user('c3', $$public.request_ride(pg_temp.r(1), '  我有两个箱子 ')$$), '{"status": "requested", "note": "我有两个箱子"}'::jsonb, 'a request keeps its note');
select is(pg_temp.as_user('c3', $$public.request_ride(pg_temp.r(1), 'other')$$), '{"status": "requested", "note": "我有两个箱子"}'::jsonb, 'a second request answers the first');
select throws_ok($$select pg_temp.as_user('a1', 'public.request_ride(pg_temp.r(1))')$$, '22023', 'own_ride', 'the organiser cannot request their own ride');
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'd4', format('public.request_ride(pg_temp.r(1), %L)', repeat('长', 141))),
  '22023', 'invalid_ride', 'a 141-character note is refused'
);
select throws_ok($$select pg_temp.as_user('e5', 'public.withdraw_ride_request(pg_temp.r(1))')$$, '55000', 'not_pending', 'withdrawing without a request is refused');
select is(pg_temp.as_user('c3', $$public.withdraw_ride_request(pg_temp.r(1))$$), '{"status": "withdrawn"}'::jsonb, 'a requester withdraws');
select is(pg_temp.as_user('c3', $$public.withdraw_ride_request(pg_temp.r(1))$$), '{"status": "withdrawn"}'::jsonb, 'withdrawing twice answers the first');
select is(pg_temp.as_user('c3', $$public.request_ride(pg_temp.r(1))$$) ->> 'status', 'requested', 'a withdrawn requester may ask again');

select throws_ok(
  $$select pg_temp.as_user('b2', 'public.decide_ride_request(pg_temp.r(1), pg_temp.u(''c3''), true)')$$,
  '42501', 'not_organiser', 'only the organiser decides'
);
select is(
  pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(1), pg_temp.u('c3'), true)$$),
  '{"status": "accepted", "taken": 2, "seats": 4}'::jsonb, 'the organiser approves a request'
);
select is(
  pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(1), pg_temp.u('c3'), true)$$) ->> 'status', 'accepted',
  'approving twice answers the first'
);
select pg_temp.as_user('d4', $$public.request_ride(pg_temp.r(1))$$);
select is(
  pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(1), pg_temp.u('d4'), false)$$) ->> 'status', 'declined',
  'the organiser declines a request'
);
select throws_ok($$select pg_temp.as_user('d4', 'public.request_ride(pg_temp.r(1))')$$, '55000', 'not_pending', 'a declined requester cannot ask again');
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.decide_ride_request(pg_temp.r(1), pg_temp.u(''f6''), true)')$$,
  '55000', 'not_pending', 'deciding on someone who did not ask is refused'
);

select pg_temp.as_user('a1', $$pg_temp.publish(3, seat_count => 2)$$);
select pg_temp.as_user('c3', $$public.request_ride(pg_temp.r(3))$$);
select pg_temp.as_user('f6', $$public.request_ride(pg_temp.r(3))$$);
select pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(3), pg_temp.u('c3'), true)$$);
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.decide_ride_request(pg_temp.r(3), pg_temp.u(''f6''), true)')$$,
  '55000', 'full', 'a full ride approves nobody else'
);
select throws_ok($$select pg_temp.as_user('d4', 'public.request_ride(pg_temp.r(3))')$$, '55000', 'full', 'a full ride takes no requests');

reset role;
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('a1'), pg_temp.u('e5')), (pg_temp.u('f6'), pg_temp.u('a1'));
set local role authenticated;
select throws_ok($$select pg_temp.as_user('e5', 'public.request_ride(pg_temp.r(1))')$$, '55000', 'closed', 'someone the organiser blocked is told the ride is closed');
select throws_ok($$select pg_temp.as_user('f6', 'public.request_ride(pg_temp.r(1))')$$, '42501', 'blocked', 'someone who blocked the organiser is told so');
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.decide_ride_request(pg_temp.r(3), pg_temp.u(''f6''), false)')$$,
  '55000', 'not_pending', 'a requester who blocked the organiser reads as withdrawn'
);

select is(pg_temp.as_user('c3', $$public.ride_leave_preview(pg_temp.r(1))$$), '{"noShow": false, "waiverAvailable": null}'::jsonb, 'leaving early is free');
select is(pg_temp.as_user('c3', $$public.leave_ride(pg_temp.r(1))$$), '{"status": "left", "noShow": null}'::jsonb, 'a member leaves before the window');
select throws_ok($$select pg_temp.as_user('c3', 'public.request_ride(pg_temp.r(1))')$$, '55000', 'not_pending', 'someone who left cannot rejoin');
select throws_ok($$select pg_temp.as_user('a1', 'public.leave_ride(pg_temp.r(1))')$$, '22023', 'own_ride', 'the organiser cancels instead of leaving');
select throws_ok($$select pg_temp.as_user('d4', 'public.leave_ride(pg_temp.r(1))')$$, '42501', 'not_member', 'a declined requester has nothing to leave');

select pg_temp.as_user('b2', $$public.request_ride(pg_temp.r(2))$$);
select pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(2), pg_temp.u('b2'), true)$$);
reset role;
select pg_temp.backdate(2, interval '10 minutes');
set local role authenticated;
select is(pg_temp.as_user('b2', $$public.ride_leave_preview(pg_temp.r(2))$$), '{"noShow": true, "waiverAvailable": true}'::jsonb, 'leaving inside 15 minutes is a no-show with the waiver');
select is(pg_temp.as_user('b2', $$public.leave_ride(pg_temp.r(2))$$), '{"status": "left", "noShow": "waived"}'::jsonb, 'leaving inside 15 minutes uses the waiver');
select is(pg_temp.as_user('b2', $$public.leave_ride(pg_temp.r(2))$$), '{"status": "left", "noShow": "waived"}'::jsonb, 'leaving twice answers the first');

select is(pg_temp.as_user('a1', $$public.ride_cancel_preview(pg_temp.r(2))$$), '{"refund": true, "noShow": false, "waiverAvailable": null}'::jsonb, 'with nobody accepted, cancelling refunds');
select is(pg_temp.as_user('a1', $$public.cancel_ride(pg_temp.r(2))$$), '{"status": "cancelled", "refund": "free", "noShow": null}'::jsonb, 'cancelling a ride nobody joined returns the free post');
reset role;
select isnt((select refunded_at from public.post_charges where item_kind = 'ride' and item_id = pg_temp.r(2)), null, 'the charge is marked refunded');
set local role authenticated;
select is(pg_temp.as_user('a1', $$public.cancel_ride(pg_temp.r(2))$$), '{"status": "cancelled", "refund": "free", "noShow": null}'::jsonb, 'cancelling twice answers the first');
select throws_ok($$select pg_temp.as_user('d4', 'public.request_ride(pg_temp.r(2))')$$, '55000', 'closed', 'a cancelled ride takes no requests');

select is(pg_temp.as_user('a1', $$public.cancel_ride(pg_temp.r(3))$$), '{"status": "cancelled", "refund": null, "noShow": null}'::jsonb, 'cancelling early with a member keeps the post spent and counts nothing');

select pg_temp.as_user('a1', $$pg_temp.publish(4)$$);
select pg_temp.as_user('d4', $$public.request_ride(pg_temp.r(4))$$);
select pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(4), pg_temp.u('d4'), true)$$);
reset role;
select pg_temp.backdate(4, interval '5 minutes');
set local role authenticated;
select is(pg_temp.as_user('a1', $$public.ride_cancel_preview(pg_temp.r(4))$$), '{"refund": false, "noShow": true, "waiverAvailable": true}'::jsonb, 'the organiser is warned inside 15 minutes');
select is(pg_temp.as_user('a1', $$public.cancel_ride(pg_temp.r(4))$$) ->> 'noShow', 'waived', 'cancelling inside 15 minutes with a member is a no-show for the organiser');

select pg_temp.as_user('a1', $$pg_temp.publish(5)$$);
reset role;
update public.rides set status = 'departed' where id = pg_temp.r(5);
set local role authenticated;
select throws_ok($$select pg_temp.as_user('d4', 'public.request_ride(pg_temp.r(5))')$$, '55000', 'departed', 'a departed ride takes no requests');
select pg_temp.as_user('a1', $$pg_temp.publish(6)$$);
reset role;
select pg_temp.backdate(6, interval '-3 hours');
set local role authenticated;
select throws_ok($$select pg_temp.as_user('d4', 'public.request_ride(pg_temp.r(6))')$$, '55000', 'closed', 'a ride past its expiry takes no requests before the job runs');

select * from finish();
rollback;

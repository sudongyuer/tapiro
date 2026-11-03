begin;
select plan(32);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (id, user_id, type, phone, display_name)
values ('00000000-0000-4000-8000-0000000000a9', '00000000-0000-0000-0000-0000000000a1', 'duitnow_id', '+60123456789', 'ALICE');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('42000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.publish(n integer, departs interval) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u('a1'));
  select public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113, now() + departs, 6, 'MYR'
  );
$$;

create function pg_temp.join(n integer, k text) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select public.request_ride(pg_temp.r(n));
  select pg_temp.act_as(pg_temp.u('a1'));
  select public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
$$;

create function pg_temp.kinds(k text, n integer) returns text[] language sql security definer as $$
  select coalesce(array_agg(e.kind order by e.id), '{}') from public.events e
  where e.recipient = pg_temp.u(k) and e.subject_id = pg_temp.r(n);
$$;

create function pg_temp.recorded(k text, kind text) returns bigint language sql security definer as $$
  select count(*) from public.push_queue p where p.recipient = pg_temp.u(k) and p.kind = recorded.kind;
$$;

select pg_temp.publish(1, interval '3 hours');
select is(pg_temp.kinds('a1', 1), '{}'::text[], 'publishing a ride tells nobody');

select pg_temp.act_as(pg_temp.u('b2'));
select public.request_ride(pg_temp.r(1));
select is(pg_temp.kinds('a1', 1), '{ride.requested}'::text[], 'a join request reaches the organiser');
select is(pg_temp.kinds('b2', 1), '{}'::text[], 'the requester is not told of their own request');
select is(pg_temp.recorded('a1', 'ride.requested'), 1::bigint, 'the request is recorded as a push (must act)');

select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request(pg_temp.r(1), pg_temp.u('b2'), true);
select is(pg_temp.kinds('b2', 1), '{ride.approved}'::text[], 'the approved rider is told');
select is(
  (select p.thread_id from public.push_queue p where p.recipient = pg_temp.u('b2') and p.kind = 'ride.approved'),
  'ride:' || pg_temp.r(1), 'pushes are grouped per ride'
);

select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride(pg_temp.r(1));
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request(pg_temp.r(1), pg_temp.u('c3'), false);
select is(pg_temp.kinds('c3', 1), '{ride.declined}'::text[], 'the declined requester is told');

select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride(pg_temp.r(1));
select public.withdraw_ride_request(pg_temp.r(1));
select is(
  (select count(*) from public.events e where e.recipient = pg_temp.u('a1') and e.kind = 'ride.withdrawn' and not e.push),
  1::bigint, 'a withdrawal reaches the organiser live only'
);
select is(pg_temp.recorded('a1', 'ride.withdrawn'), 0::bigint, 'a withdrawal records no push');

select pg_temp.act_as(pg_temp.u('a1'));
select public.revise_ride_time(pg_temp.r(1), now() + interval '4 hours');
select is(
  pg_temp.kinds('b2', 1), '{ride.approved,ride.time_revised}'::text[], 'a revised time reaches accepted members'
);
select is(pg_temp.recorded('b2', 'ride.time_revised'), 1::bigint, 'a revised time is recorded as a push (waiting)');
select is(
  (select count(*) from public.events e where e.recipient = pg_temp.u('a1') and e.kind = 'ride.time_revised'),
  0::bigint, 'the organiser is not told of their own change'
);

select pg_temp.publish(2, interval '20 minutes');
select pg_temp.join(2, 'b2');
select pg_temp.join(2, 'c3');
select pg_temp.act_as(pg_temp.u('b2'));
select public.mark_ride_arrived(pg_temp.r(2));
select ok('ride.arrival' = any (pg_temp.kinds('c3', 2)), '我到了 reaches the other riders');
select ok('ride.arrival' = any (pg_temp.kinds('a1', 2)), '我到了 reaches the organiser');
select is(
  (select count(*) from public.events e where e.kind = 'ride.arrival' and e.push), 0::bigint, '我到了 never pushes'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.depart_ride(pg_temp.r(2), array[pg_temp.u('b2')]);
select ok('ride.no_show' = any (pg_temp.kinds('c3', 2)), 'the unticked member is told they were left off');
select is(pg_temp.recorded('c3', 'ride.no_show'), 1::bigint, 'the no-show is a push (must act: appeal)');
select ok('ride.departed' = any (pg_temp.kinds('b2', 2)), 'the boarded rider sees the departure live');

select public.reach_ride(pg_temp.r(2));
select public.send_ride_split(
  pg_temp.r(2), 5000, jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2500)), null
);
select ok('ride.split_sent' = any (pg_temp.kinds('b2', 2)), 'the split reaches the rider who must pay');
select is(pg_temp.recorded('b2', 'ride.split_sent'), 1::bigint, 'the split is recorded as a push');

create function pg_temp.payment_of(n integer, k text) returns uuid language sql security definer as $$
  select payment_id from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

select pg_temp.act_as(pg_temp.u('b2'));
select ok(
  (public.my_rides() #>> '{items,0,myDueSince}')::timestamptz is not null, 'my_rides gives the rider the due time'
);
select public.mark_payment_paid(pg_temp.payment_of(2, 'b2'), '00000000-0000-4000-8000-0000000000a9', 2500);
select is(
  (select count(*) from public.events e where e.recipient = pg_temp.u('a1') and e.kind = 'payment.marked_paid'),
  1::bigint, '我已付款 on a ride payment reaches the organiser'
);
select is(public.my_rides() #> '{items,0,myDueSince}', 'null'::jsonb, 'a marked-paid payment has no due time');

select pg_temp.act_as(pg_temp.u('a1'));
select public.update_ride_details(pg_temp.r(1), 'VEN 2381', now() + interval '5 hours');
select pg_temp.act_as(pg_temp.u('b2'));
select ok(
  (select (x ->> 'eta') is not null from jsonb_array_elements(public.my_rides() -> 'items') x where x ->> 'id' = pg_temp.r(1)::text),
  'my_rides gives an accepted member the typed 预计到'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.block_user(pg_temp.u('a1'));
select is(
  (select count(*) from public.events e where e.subject_id = pg_temp.r(1) and e.kind = 'ride.left'),
  0::bigint, 'a membership ended by a block tells nobody'
);

select is(
  private.quiet_until('2026-11-02 15:30+00'), '2026-11-03 00:00+00'::timestamptz, '23:30 in Malaysia waits for 08:00'
);
select is(
  private.quiet_until('2026-11-02 22:00+00'), '2026-11-03 00:00+00'::timestamptz, '06:00 in Malaysia waits for 08:00'
);
select is(private.quiet_until('2026-11-02 04:00+00'), null, 'noon in Malaysia is not quiet');

insert into public.events (recipient, kind, subject_id, push, created_at)
values
  (pg_temp.u('c3'), 'ride.cancelled', pg_temp.r(1), true, '2026-11-02 17:00+00'),
  (pg_temp.u('c3'), 'ride.no_show', pg_temp.r(2), true, '2026-11-02 17:00+00');
select is(
  (select array[p.quiet::text, p.send_at::text] from public.push_queue p
   where p.recipient = pg_temp.u('c3') and p.kind = 'ride.cancelled'),
  array['true', '2026-11-03 00:00:00+00'], 'a push at 01:00 for a ride not under way waits for 08:00'
);
select pg_temp.publish(3, interval '20 minutes');
update public.rides set status = 'gathering' where id = pg_temp.r(3);
insert into public.events (recipient, kind, subject_id, push, created_at)
values (pg_temp.u('c3'), 'ride.appealed', pg_temp.r(3), true, '2026-11-02 17:00+00');
select is(
  (select p.quiet from public.push_queue p where p.recipient = pg_temp.u('c3') and p.kind = 'ride.appealed'),
  false, 'the ride you are on is not held by quiet hours'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok($$select count(*) from public.events$$, '42501', null, 'clients cannot read events');
select throws_ok($$select count(*) from public.push_queue$$, '42501', null, 'clients cannot read push recordings');

select * from finish();
rollback;

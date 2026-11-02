begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'd4', 'e5']) k;
insert into public.coin_ledger (user_id, reason, delta)
values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 10), ('00000000-0000-0000-0000-0000000000b2', 'help_settled', 10);
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000e5');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('60000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.kl(days integer, at_time text) returns timestamptz language sql as $$
  select (((now() at time zone 'Asia/Kuala_Lumpur')::date + days) + at_time::time) at time zone 'Asia/Kuala_Lumpur';
$$;

create function pg_temp.publish(
  n integer, organiser text, departs timestamptz, latitude double precision, longitude double precision,
  dest text default 'KLIA2', seat_count integer default 4
) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u(organiser));
  select public.publish_ride(
    pg_temp.r(n), 'Start ' || n, 'S' || n, latitude, longitude, dest, left(dest, 8), 3.1180, 101.6770, departs,
    seat_count, 'MYR', estimate_minor => 7600
  );
$$;

create function pg_temp.ids(answer jsonb) returns integer[] language sql as $$
  select coalesce(array_agg(right(i ->> 'id', 2)::integer order by n), '{}')
  from jsonb_array_elements(answer -> 'items') with ordinality as t(i, n);
$$;

create function pg_temp.nearby(after jsonb default null, size integer default 20, located boolean default true)
returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u('d4'));
  select public.nearby_rides(
    case when located then 3.0733 end, case when located then 101.6078 end, after, size
  );
$$;

select pg_temp.publish(1, 'a1', pg_temp.kl(1, '10:00'), 3.0740, 101.6078);
select pg_temp.publish(2, 'b2', pg_temp.kl(1, '11:00'), 3.1180, 101.6770, 'Mid Valley Megamall');
select pg_temp.publish(3, 'a1', pg_temp.kl(2, '09:00'), 3.0733, 101.6078);
select pg_temp.publish(4, 'b2', pg_temp.kl(1, '12:00'), 3.0733, 101.6078);
select pg_temp.publish(5, 'e5', pg_temp.kl(1, '10:30'), 3.0733, 101.6078);
select pg_temp.publish(6, 'a1', pg_temp.kl(1, '13:00'), 3.0733, 101.6078);
select pg_temp.publish(7, 'd4', pg_temp.kl(1, '14:00'), 3.0733, 101.6078);
select pg_temp.publish(8, 'a1', pg_temp.kl(1, '15:00'), 3.0733, 101.6078);
select pg_temp.publish(9, 'b2', pg_temp.kl(1, '16:00'), 3.0735, 101.6080, seat_count => 2);
select pg_temp.publish(10, 'a1', pg_temp.kl(1, '17:00'), 3.2000, 101.7000);
select pg_temp.act_as(pg_temp.u('a1'));
select public.cancel_ride(pg_temp.r(6));
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride(pg_temp.r(8));
select public.request_ride(pg_temp.r(10));
select public.withdraw_ride_request(pg_temp.r(10));
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride(pg_temp.r(9));
select pg_temp.act_as(pg_temp.u('b2'));
select public.decide_ride_request(pg_temp.r(9), pg_temp.u('c3'), true);

insert into public.rides (
  id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short, depart_at, currency,
  status, settled_at
)
values
  (pg_temp.r(11), pg_temp.u('a1'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威', 'SRID=4326;POINT(101.677 3.118)',
   'Mid Valley', '谷中城', now() - interval '1 day', 'MYR', 'closed', now() - interval '23 hours'),
  (pg_temp.r(12), pg_temp.u('a1'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威', 'SRID=4326;POINT(101.677 3.118)',
   'Mid Valley', '谷中城', now() - interval '2 days', 'MYR', 'closed', now() - interval '25 hours');
insert into public.ride_members (ride_id, member_id, status)
values (pg_temp.r(11), pg_temp.u('a1'), 'boarded'), (pg_temp.r(11), pg_temp.u('d4'), 'boarded'),
  (pg_temp.r(12), pg_temp.u('a1'), 'boarded'), (pg_temp.r(12), pg_temp.u('d4'), 'boarded');

set local role authenticated;

select is(
  pg_temp.ids(pg_temp.nearby()), array[4, 1, 9, 2, 10, 3],
  'joinable rides group by Malaysia day, then snapped start distance, then departure; blocked, cancelled, own and requested rides are out'
);
select is(
  pg_temp.ids(pg_temp.nearby(located => false)), array[1, 2, 4, 9, 10, 3],
  'without a location the rides order by day, then departure time'
);
create temp table first_page as select pg_temp.nearby(size => 2) as answer;
select is(pg_temp.ids((select answer from first_page)), array[4, 1], 'the first page holds two rides');
select is(
  (select answer -> 'next' from first_page),
  jsonb_build_object('id', pg_temp.r(1), 'latitude', 3.0733, 'longitude', 101.6078), 'the cursor names the last ride and the point'
);
create temp table second_page as select pg_temp.nearby((select answer -> 'next' from first_page), 2) as answer;
select is(pg_temp.ids((select answer from second_page)), array[9, 2], 'the second page continues after the cursor');
create temp table third_page as select pg_temp.nearby((select answer -> 'next' from second_page), 2) as answer;
select is(pg_temp.ids((select answer from third_page)), array[10, 3], 'the third page crosses into the next day');
select is((select answer -> 'next' from third_page), 'null'::jsonb, 'the last page has no cursor');
select throws_ok(
  format('select public.nearby_rides(3.1, 101.6078, %L::jsonb)', (select answer -> 'next' from first_page)),
  '22023', 'ride_cursor_mismatch', 'a cursor from another point is refused'
);
select throws_ok(
  $$select public.nearby_rides(3.0733, 101.6078, '{"id": "60000000-0000-0000-0000-000000000004", "latitude": 3.0733, "longitude": 101.6078, "filter": "all"}')$$,
  '22023', 'invalid_ride_query', 'filters are not part of the ride list (182 B)'
);
select throws_ok($$select public.nearby_rides(3.0733, null)$$, '22023', 'invalid_ride_query', 'half a point is refused');
select throws_ok($$select public.nearby_rides(page_size => 0)$$, '22023', 'invalid_ride_query', 'an empty page size is refused');

create temp table listed as select i from jsonb_array_elements(pg_temp.nearby() -> 'items') i;
select is(
  (select array_agg(k order by k) from jsonb_object_keys((select i from listed where i ->> 'id' = pg_temp.r(1)::text)) k),
  array['airport', 'day', 'departAt', 'dest', 'distanceM', 'estimate', 'flightDepartsAt', 'id', 'largeBags', 'organiser',
    'point', 'reference', 'revisedAt', 'seats', 'settledAt', 'splitMode', 'start', 'status', 'taken'],
  'a joinable ride carries no member list'
);
select is(
  (select i -> 'organiser' from listed where i ->> 'id' = pg_temp.r(1)::text),
  jsonb_build_object('id', pg_temp.u('a1'), 'name', 'Alice', 'tier', 'new_friend'), 'non-members see only the organiser'
);
select is(
  (select array[i ->> 'taken', i ->> 'seats'] from listed where i ->> 'id' = pg_temp.r(9)::text), array['2', '2'],
  'a full ride stays listed with its seats taken'
);
select is((select i -> 'distanceM' from listed where i ->> 'id' = pg_temp.r(1)::text), '100'::jsonb, 'distance is rounded to 100 m');
select is(
  (select i -> 'point' from listed where i ->> 'id' = pg_temp.r(1)::text), '{"latitude": 3.074, "longitude": 101.608}'::jsonb,
  'the start point is snapped for non-members'
);
select is(
  (select array[i ->> 'airport', i -> 'dest' ->> 'kind'] from listed where i ->> 'id' = pg_temp.r(1)::text), array['true', 'airport'],
  'a ride to KLIA2 is marked as an airport ride'
);
select is((select i ->> 'airport' from listed where i ->> 'id' = pg_temp.r(2)::text), 'false', 'a mall ride is not');
select is(
  (select i ->> 'day' from listed where i ->> 'id' = pg_temp.r(3)::text),
  ((now() at time zone 'Asia/Kuala_Lumpur')::date + 2)::text, 'the day is the Malaysia date of departure'
);
select is((select i -> 'estimate' from listed where i ->> 'id' = pg_temp.r(1)::text), '{"minor": 7600, "currency": "MYR"}'::jsonb, 'the whole-ride estimate is listed for 每人约');

select pg_temp.act_as(pg_temp.u('d4'));
create temp table my_list as select public.my_rides() as answer;
select is(
  (select array_agg(right(i ->> 'id', 2)::integer || ':' || (i ->> 'role') order by n)
   from jsonb_array_elements((select answer -> 'items' from my_list)) with ordinality t(i, n)),
  array['11:member', '7:organiser', '8:applicant'],
  'my rides: settled within 24 hours, mine to organise and my request'
);
select is((select answer -> 'historyCount' from my_list), '1'::jsonb, 'a ride settled more than 24 hours ago moves to history');
select is(
  (select array_agg(i ->> 'id') from jsonb_array_elements(public.ride_history()) i), array[pg_temp.r(12)::text],
  '去过的 lists the older settled ride'
);
select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select i ->> 'pendingRequests' from jsonb_array_elements(public.my_rides() -> 'items') i where i ->> 'id' = pg_temp.r(9)::text),
  '0', 'the organiser sees how many requests wait'
);

select * from finish();
rollback;

begin;
select plan(39);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli'), ('f6', 'Fai')) v (k, n);

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

insert into public.rides (
  id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short, depart_at, currency,
  estimate_minor, status
)
values
  ('10000000-0000-0000-0000-000000000001', pg_temp.u('a1'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
   'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', now() + interval '3 hours', 'MYR', 7600, 'open'),
  ('10000000-0000-0000-0000-000000000002', pg_temp.u('a1'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
   'SRID=4326;POINT(101.6770 3.1180)', 'Mid Valley', '谷中城', now() - interval '1 hour', 'MYR', null, 'departed');
insert into public.ride_details (ride_id, meeting_note, plate)
values ('10000000-0000-0000-0000-000000000001', 'Geo 大堂门口', 'VEN 2381 · 白色 Alza'),
  ('10000000-0000-0000-0000-000000000002', null, 'WXY 1');
insert into public.ride_members (ride_id, member_id, status, note)
values
  ('10000000-0000-0000-0000-000000000001', pg_temp.u('a1'), 'accepted', null),
  ('10000000-0000-0000-0000-000000000001', pg_temp.u('b2'), 'accepted', null),
  ('10000000-0000-0000-0000-000000000001', pg_temp.u('c3'), 'requested', '我有两个箱子'),
  ('10000000-0000-0000-0000-000000000001', pg_temp.u('e5'), 'requested', null),
  ('10000000-0000-0000-0000-000000000002', pg_temp.u('a1'), 'boarded', null),
  ('10000000-0000-0000-0000-000000000002', pg_temp.u('b2'), 'boarded', null),
  ('10000000-0000-0000-0000-000000000002', pg_temp.u('f6'), 'no_show', null);
insert into public.ride_receipts (ride_id, proof_path)
values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002/receipt.jpg');
insert into public.ride_events (ride_id, kind, actor_id) values ('10000000-0000-0000-0000-000000000001', 'published', pg_temp.u('a1'));
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('a1'), pg_temp.u('e5'));

select is(
  (select extensions.st_astext(start_public::extensions.geometry) from public.rides
   where id = '10000000-0000-0000-0000-000000000001'),
  'POINT(101.608 3.073)', 'the public start point is snapped to 0.001 degrees'
);
select is(private.place_kind('KLIA2 Arrival Hall'), 'airport'::public.place_kind, 'KLIA2 is an airport');
select is(
  (select short_name from public.place_short_names
   where strpos(private.normalise_place('Kuala Lumpur International Airport Terminal 2'), pattern) > 0
   order by char_length(pattern) desc limit 1),
  'KLIA2', 'the longest pattern wins over KLIA'
);
select is(private.place_kind('  MID   Valley  Megamall '), 'mall'::public.place_kind, 'spacing and case are ignored');
select is(private.place_kind('ＫＬＩＡ'), 'airport'::public.place_kind, 'full-width letters are normalised');
select is(private.place_kind('Taylor’s University'), 'campus'::public.place_kind, 'curly apostrophes match');
select is(private.place_kind('Cyberjaya'), null, 'a short name without a kind has no kind');
select is(private.place_kind('Somewhere new'), null, 'an unknown place has no kind');
select is(
  (select short_name from public.place_short_names where pattern = 'sunway geo'), '双威', 'Sunway Geo is 双威'
);
select is(
  (select short_name from public.place_short_names where pattern = 'mid valley megamall'), '谷中城',
  'Mid Valley Megamall is 谷中城'
);
select throws_ok(
  $$insert into public.place_short_names values ('Upper Case', 'X', null)$$, '23514', null,
  'patterns are stored lower-case'
);
select throws_ok(
  $$insert into public.place_short_names values ('too long', '123456789', null)$$, '23514', null,
  'short names are at most eight characters'
);
select results_eq(
  $$select currency::text, min_minor, max_minor, step_minor from public.post_limits where item_kind = 'ride' order by 1$$,
  $$values ('CNY', 100::bigint, 160000::bigint, 1::bigint), ('MYR', 100::bigint, 100000::bigint, 1::bigint)$$,
  'rides take any minor amount within the ride limits'
);
select throws_ok(
  $$update public.rides set estimate_minor = 99 where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', 'invalid_ride', 'an estimate below the limit is rejected'
);
select throws_ok(
  $$update public.rides set seats = 7 where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'seven seats are rejected'
);
select throws_ok(
  $$update public.rides set start_short = '123456789' where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a nine-character short name is rejected'
);

set local role anon;
select ok((select count(*) from public.place_short_names) >= 20, 'the short-name table is readable without signing in');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('d4'));
select is(
  (select array_agg(id order by id) from public.rides), array['10000000-0000-0000-0000-000000000001'::uuid],
  'an outsider sees the open ride only'
);
select throws_ok($$select start_point from public.rides$$, '42501', null, 'nobody selects the exact start point');
select throws_ok($$select start_public from public.rides$$, '42501', null, 'the snapped point is read through RPCs');
select is((select count(*) from public.ride_details), 0::bigint, 'an outsider reads no plate or meeting note');
select is((select count(*) from public.ride_members), 0::bigint, 'an outsider sees no members');
select throws_ok($$select * from public.ride_events$$, '42501', null, 'ride events are server-only');
select throws_ok(
  $$update public.rides set seats = 2$$, '42501', null, 'clients cannot write rides'
);

select pg_temp.act_as(pg_temp.u('c3'));
select results_eq(
  $$select member_id from public.ride_members$$, $$values ('00000000-0000-0000-0000-0000000000c3'::uuid)$$,
  'a requester sees only their own row'
);
select throws_ok($$select note from public.ride_members$$, '42501', null, 'notes are read through RPCs');
select is((select count(*) from public.ride_details), 0::bigint, 'a requester reads no plate');

select pg_temp.act_as(pg_temp.u('e5'));
select is((select count(*) from public.rides), 0::bigint, 'someone the organiser blocked sees no ride');

select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select array_agg(member_id order by member_id) from public.ride_members where ride_id = '10000000-0000-0000-0000-000000000001'),
  array[pg_temp.u('a1'), pg_temp.u('b2'), pg_temp.u('c3')], 'the organiser sees requests except from people they blocked'
);
select is((select count(*) from public.ride_details), 2::bigint, 'the organiser reads the details');

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select array_agg(member_id order by member_id) from public.ride_members where ride_id = '10000000-0000-0000-0000-000000000001'),
  array[pg_temp.u('a1'), pg_temp.u('b2')], 'a member sees the other members but not the requesters'
);
select is(
  (select plate from public.ride_details where ride_id = '10000000-0000-0000-0000-000000000001'),
  'VEN 2381 · 白色 Alza', 'a member reads the plate'
);
select is((select count(*) from public.rides), 2::bigint, 'a member still sees the departed ride');
select is((select count(*) from public.ride_receipts), 1::bigint, 'a boarded rider sees the receipt');

select pg_temp.act_as(pg_temp.u('f6'));
select is((select count(*) from public.ride_receipts), 0::bigint, 'a no-show does not see the receipt');
select is(
  (select plate from public.ride_details where ride_id = '10000000-0000-0000-0000-000000000002'), 'WXY 1',
  'a no-show member still reads the plate'
);

select pg_temp.act_as(pg_temp.u('d4'));
select is((select count(*) from public.ride_receipts), 0::bigint, 'an outsider does not see the receipt');
select is(
  (select count(*) from storage.objects where bucket_id = 'ride-receipts'), 0::bigint,
  'no receipt objects are visible to an outsider'
);

reset role;
select is(
  (select count(*) from public.ride_events), 1::bigint, 'the service role reads ride events'
);

select * from finish();
rollback;

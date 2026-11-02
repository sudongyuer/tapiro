begin;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
values ('00000000-0000-0000-0000-0000000000a1', 'cash'), ('00000000-0000-0000-0000-0000000000e5', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('50000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.ride(n integer, organiser text, members text[] default '{}', requesters text[] default '{}')
returns void language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u(organiser));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113, now() + interval '3 hours', 4, 'MYR'
  );
  foreach k in array members || requesters loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
  end loop;
  perform pg_temp.act_as(pg_temp.u(organiser));
  foreach k in array members loop
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
end;
$$;

create function pg_temp.departs(n integer, offset_by interval) returns void language sql as $$
  update public.rides set depart_at = now() + offset_by where id = pg_temp.r(n);
$$;

create function pg_temp.status(n integer) returns text language sql as $$
  select status::text from public.rides where id = pg_temp.r(n);
$$;

select pg_temp.ride(1, 'a1');
select pg_temp.ride(2, 'a1');
select pg_temp.ride(3, 'a1', array['b2']);
select pg_temp.ride(4, 'a1', array['b2']);
select pg_temp.departs(1, interval '20 minutes');
select pg_temp.departs(2, interval '-2 hours -1 minute');
select pg_temp.departs(3, interval '-2 hours -1 minute');
select pg_temp.departs(4, interval '-3 hours');
update public.rides set status = 'departed' where id = pg_temp.r(4);

select is(public.run_ride_jobs(), '{"gathering": 1, "expired": 2, "skipped": 0}'::jsonb, 'the job opens 集合 and expires two rides');
select is(pg_temp.status(1), 'gathering', '30 minutes before departure the ride is at 集合');
select is(pg_temp.status(2), 'expired', '2 hours after departure without 出发 the ride expires');
select isnt(
  (select refunded_at from public.post_charges where item_kind = 'ride' and item_id = pg_temp.r(2)), null,
  'an expired ride nobody joined returns its post'
);
select is(pg_temp.status(3), 'expired', 'a ride with a member expires too');
select is(
  (select refunded_at from public.post_charges where item_kind = 'ride' and item_id = pg_temp.r(3)), null,
  'an expired ride with an accepted member keeps the post spent'
);
select is(
  (select count(*) from public.reputation_events where kind = 'no_show' and item_kind = 'ride'), 0::bigint,
  'nobody is a no-show when a ride expires'
);
select is(pg_temp.status(4), 'departed', 'a departed ride is left alone');
select is(public.run_ride_jobs(), '{"gathering": 0, "expired": 0, "skipped": 0}'::jsonb, 'a second run changes nothing');
select is((select count(*) from cron.job where jobname = 'ride-jobs'), 1::bigint, 'the ride job is scheduled');

update public.rides set status = 'closed', settled_at = now() - interval '31 days' where id = pg_temp.r(4);
insert into public.ride_receipts (ride_id, proof_path) values (pg_temp.r(4), pg_temp.r(4) || '/grab.jpg');
insert into storage.objects (bucket_id, name, created_at)
values
  ('ride-receipts', pg_temp.r(4) || '/grab.jpg', now() - interval '31 days'),
  ('ride-receipts', '99999999-0000-0000-0000-000000000000/lost.jpg', now() - interval '4 hours'),
  ('ride-receipts', pg_temp.r(1) || '/draft.jpg', now() - interval '10 minutes');
select results_eq(
  $$select object_name, ride_id, clears_receipt from public.ride_receipts_to_delete() order by object_name$$,
  $$values (pg_temp.r(4) || '/grab.jpg', pg_temp.r(4), true),
    ('99999999-0000-0000-0000-000000000000/lost.jpg', null::uuid, false)$$,
  'receipts go 30 days after settling, orphans after a few hours, fresh drafts stay'
);
select public.clear_ride_receipt(pg_temp.r(4));
select is((select count(*) from public.ride_receipts where ride_id = pg_temp.r(4)), 0::bigint, 'clearing removes the receipt row');

select pg_temp.ride(5, 'e5', array['c3'], array['d4']);
select pg_temp.ride(6, 'e5');
select pg_temp.ride(7, 'a1', '{}', array['d4']);
select results_eq(
  $$select id, role, status::text from public.active_rides_of(pg_temp.u('c3'))$$,
  $$values (pg_temp.r(5), 'rider', 'open')$$, 'an accepted rider has an active ride'
);
select results_eq(
  $$select id, role from public.active_rides_of(pg_temp.u('e5'))$$,
  $$values (pg_temp.r(5), 'organiser')$$, 'an organiser with a member is active; one alone is not'
);
select is((select count(*) from public.active_rides_of(pg_temp.u('d4'))), 0::bigint, 'a requester has no active ride');
select throws_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000c3'$$, '55000', 'active_rides',
  'deleting an accepted rider is blocked'
);
select throws_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000e5'$$, '55000', 'active_rides',
  'deleting an organiser with members is blocked'
);
update public.ride_members set status = 'left' where ride_id = pg_temp.r(5) and member_id = pg_temp.u('c3');
delete from auth.users where id = pg_temp.u('d4');
select is(
  (select count(*) from public.ride_events where kind = 'withdrawn' and note = 'account_deleted'), 2::bigint,
  'a deleted requester''s requests are withdrawn first'
);
delete from auth.users where id = pg_temp.u('e5');
select is(array[pg_temp.status(5), pg_temp.status(6)], array['cancelled', 'cancelled'], 'the deleted organiser''s open rides are cancelled');
select ok(
  (select bool_and(refunded_at is not null) from public.post_charges where item_kind = 'ride' and item_id in (pg_temp.r(5), pg_temp.r(6))),
  'their posts are returned'
);
select is((select organiser_id from public.rides where id = pg_temp.r(5)), null, 'the ride keeps no link to the deleted organiser');

select * from finish();
rollback;

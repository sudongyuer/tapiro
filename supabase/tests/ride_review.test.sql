begin;
select plan(25);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli'), ('f6', 'Fai')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');
insert into public.coin_ledger (user_id, reason, delta)
values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 10);

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('70000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

create function pg_temp.ride(
  n integer, mode public.ride_split_mode, members text[], declined text[] default '{}', withdrawn text[] default '{}',
  departs interval default interval '20 minutes'
) returns void language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'Mid Valley Megamall', '谷中城', 3.1180, 101.6770,
    now() + departs, 6, 'MYR', mode
  );
  foreach k in array members || declined || withdrawn loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
  end loop;
  foreach k in array withdrawn loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.withdraw_ride_request(pg_temp.r(n));
  end loop;
  perform pg_temp.act_as(pg_temp.u('a1'));
  foreach k in array members loop
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
  foreach k in array declined loop
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), false);
  end loop;
  insert into public.ride_details (ride_id, plate) values (pg_temp.r(n), 'VEN 2381');
end;
$$;

create function pg_temp.depart(n integer, boarded text[]) returns jsonb language sql as $$
  select pg_temp.as_user('a1', format('public.depart_ride(pg_temp.r(%s), %L::uuid[])', n,
    (select coalesce(array_agg(pg_temp.u(b)), '{}') from unnest(boarded) b)));
$$;

create function pg_temp.status_of(n integer, k text) returns text language sql as $$
  select status::text from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.stickers(n integer) returns bigint language sql as $$
  select count(*) from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(n);
$$;

select pg_temp.ride(1, 'tapiro', array['b2', 'c3']);
select pg_temp.ride(2, 'tapiro', array['b2', 'c3', 'd4']);
select pg_temp.ride(3, 'grab', array['b2']);
select pg_temp.ride(4, 'tapiro', array['b2'], array['e5'], array['f6']);
select pg_temp.ride(5, 'tapiro', '{}', departs => interval '3 hours');

set local role authenticated;

select pg_temp.depart(1, '{}');
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(1))$$), '{"status": "closed"}'::jsonb, 'an organiser who ticked nobody can close at once');
reset role;
select is(pg_temp.stickers(1), 0::bigint, 'a ride nobody else boarded mints no sticker');
set local role authenticated;
select is(pg_temp.as_user('b2', $$public.appeal_ride_no_show(pg_temp.r(1))$$), '{"status": "appealed"}'::jsonb, 'the unticked member still appeals after the ride closed');
select is(
  pg_temp.as_user('a1', $$public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u('b2'))$$), '{"status": "boarded"}'::jsonb,
  'the organiser confirms the appeal after the ride closed'
);
select is(
  pg_temp.depart(1, '{}') -> 'noShows' -> 0 ->> 'memberId', pg_temp.u('b2')::text,
  'a late 出发 replay after 到了 answers the first boarding'
);
reset role;
update public.ride_events set created_at = now() - interval '73 hours' where ride_id = pg_temp.r(1) and kind = 'departed';
set local role authenticated;
select throws_ok($$select pg_temp.as_user('c3', 'public.appeal_ride_no_show(pg_temp.r(1))')$$, '55000', 'invalid_transition', 'an appeal more than 72 hours after 出发 is refused');

select pg_temp.depart(2, array['b2']);
select pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(2))$$);
select pg_temp.as_user('a1', format('public.send_ride_split(pg_temp.r(2), 5000, %L::jsonb)',
  jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2500))));
select is(pg_temp.as_user('c3', $$public.appeal_ride_no_show(pg_temp.r(2))$$), '{"status": "appealed"}'::jsonb, 'an appeal works while the split is settling');
select pg_temp.act_as(pg_temp.u('d4'));
select is((select count(*) from public.ride_details where ride_id = pg_temp.r(2)), 0::bigint, 'a no-show no longer reads the plate');
select is(
  (select array_agg(member_id) from public.ride_members where ride_id = pg_temp.r(2)), array[pg_temp.u('d4')],
  'a no-show sees only their own member row'
);
select pg_temp.act_as(pg_temp.u('c3'));
select is((select count(*) from public.ride_details where ride_id = pg_temp.r(2)), 0::bigint, 'an appealing member does not read the plate yet');
select is(
  pg_temp.as_user('b2', $$public.confirm_ride_appeal(pg_temp.r(2), pg_temp.u('c3'))$$), '{"status": "boarded"}'::jsonb,
  'a boarded rider confirms the appeal while settling'
);
select pg_temp.act_as(pg_temp.u('c3'));
select is((select count(*) from public.ride_details where ride_id = pg_temp.r(2)), 1::bigint, 'a confirmed appeal restores the plate');
reset role;
select is(
  (select array[share_minor::text, payment_id::text] from public.ride_members where ride_id = pg_temp.r(2) and member_id = pg_temp.u('c3')),
  array[null, null]::text[], 'a confirmed appeal after the split leaves the split as sent'
);
select is((select count(*) from public.payments where item_id = pg_temp.r(2)), 1::bigint, 'no payment is opened for the late boarder');
set local role authenticated;

select pg_temp.depart(3, '{}');
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(3))$$), '{"status": "closed"}'::jsonb, 'a Grab-split ride nobody boarded closes');
reset role;
select is(pg_temp.stickers(3), 0::bigint, 'a Grab-split ride without another rider mints no sticker');
set local role authenticated;

select pg_temp.act_as(pg_temp.u('e5'));
select is((select count(*) from public.rides where id = pg_temp.r(4)), 1::bigint, 'a declined applicant sees an open ride like anyone');
select pg_temp.depart(4, array['b2']);
select pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(4))$$);
select pg_temp.as_user('a1', format('public.send_ride_split(pg_temp.r(4), 6000, %L::jsonb)',
  jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 3000))));
select pg_temp.act_as(pg_temp.u('e5'));
select is((select count(*) from public.rides where id = pg_temp.r(4)), 0::bigint, 'a declined applicant loses the ride once it leaves');
select pg_temp.act_as(pg_temp.u('f6'));
select is((select count(*) from public.rides where id = pg_temp.r(4)), 0::bigint, 'a withdrawn applicant loses the ride too');
select pg_temp.act_as(pg_temp.u('b2'));
select is((select total_minor from public.rides where id = pg_temp.r(4)), 6000::bigint, 'a boarded rider still reads the total');

select throws_ok(
  $$select pg_temp.as_user('a1', 'public.revise_ride_time(pg_temp.r(5), now() + interval ''2 hours'')')$$,
  '22023', 'invalid_ride', 'a revised time cannot be earlier than the current departure'
);
select is(
  pg_temp.as_user('a1', $$public.revise_ride_time(pg_temp.r(5), now() + interval '4 hours')$$) ->> 'status', 'open',
  'a later time is accepted'
);
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.revise_ride_time(pg_temp.r(5), now() + interval ''3 hours 30 minutes'')')$$,
  '22023', 'invalid_ride', 'moving back towards the first time after a delay is refused too'
);
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.revise_ride_time(pg_temp.r(5), now() + interval ''28 hours'')')$$,
  '22023', 'invalid_ride', 'the 24-hour cap from the first time still holds'
);
select is(
  pg_temp.as_user('a1', $$public.revise_ride_time(pg_temp.r(5), (select coalesce(revised_at, depart_at) from public.rides where id = pg_temp.r(5)))$$) ->> 'status',
  'open', 'the same time again changes nothing'
);

select * from finish();
rollback;

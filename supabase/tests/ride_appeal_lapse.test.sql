begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

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
  select ('80000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

create function pg_temp.ride(n integer, members text[]) returns void language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'Mid Valley Megamall', '谷中城', 3.1180, 101.6770,
    now() + interval '20 minutes', 6, 'MYR'
  );
  foreach k in array members loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
  end loop;
  perform pg_temp.act_as(pg_temp.u('a1'));
  foreach k in array members loop
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
end;
$$;

create function pg_temp.depart(n integer, boarded text[]) returns jsonb language sql as $$
  select pg_temp.as_user('a1', format('public.depart_ride(pg_temp.r(%s), %L::uuid[])', n,
    (select coalesce(array_agg(pg_temp.u(b)), '{}') from unnest(boarded) b)));
$$;

create function pg_temp.no_show_outcome(n integer, k text) returns text language sql as $$
  select note from public.ride_events where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k) and kind = 'no_show';
$$;

create function pg_temp.status_of(n integer, k text) returns text language sql as $$
  select status::text from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.counted(k text) returns integer language plpgsql as $$
begin
  perform public.recompute_reputation();
  return (select counted_no_shows from public.reputation_snapshots where user_id = pg_temp.u(k));
end;
$$;

create function pg_temp.past_appeal_window(n integer) returns void language sql as $$
  update public.ride_events set created_at = now() - interval '73 hours' where ride_id = pg_temp.r(n) and kind = 'departed';
$$;

insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
values (pg_temp.u('d4'), 'no_show', 'bounty', gen_random_uuid(), true);

select pg_temp.ride(1, array['b2', 'c3', 'd4']);
select pg_temp.ride(2, array['b2', 'c3']);
select pg_temp.ride(3, array['e5']);
select pg_temp.ride(4, array['e5']);

set local role authenticated;

select pg_temp.depart(1, array['b2', 'c3']);
reset role;
select is(pg_temp.no_show_outcome(1, 'd4'), 'counted', 'a no-show after the waiver was used counts');
set local role authenticated;
select is(pg_temp.as_user('d4', $$public.appeal_ride_no_show(pg_temp.r(1))$$), '{"status": "appealed"}'::jsonb, 'the no-show taps 我上车了');
reset role;
select is(pg_temp.counted('d4'), 0, 'a pending appeal is not counted');
select is(
  (select count(*) from public.reputation_events where user_id = pg_temp.u('d4') and item_kind = 'ride' and item_id = pg_temp.r(1)),
  1::bigint, 'the no-show row stays while the appeal waits'
);

set local role authenticated;
select pg_temp.depart(2, array['b2']);
select pg_temp.as_user('c3', $$public.appeal_ride_no_show(pg_temp.r(2))$$);
select is(pg_temp.as_user('b2', $$public.confirm_ride_appeal(pg_temp.r(2), pg_temp.u('c3'))$$), '{"status": "boarded"}'::jsonb, 'a boarded rider confirms the appeal');

select pg_temp.depart(3, '{}');
select pg_temp.as_user('e5', $$public.appeal_ride_no_show(pg_temp.r(3))$$);
select pg_temp.depart(4, '{}');
reset role;
select is(pg_temp.no_show_outcome(3, 'e5'), 'waived', 'the first no-show in 60 days takes the waiver');
select is(pg_temp.no_show_outcome(4, 'e5'), 'counted', 'a pending appeal still holds the waiver, as if no appeal had happened');

select pg_temp.past_appeal_window(1);
select pg_temp.past_appeal_window(2);
select pg_temp.past_appeal_window(3);
set local role authenticated;
select throws_ok(
  $$select pg_temp.as_user('c3', 'public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u(''d4''))')$$,
  '55000', 'invalid_transition', 'a confirmation more than 72 hours after 出发 is refused'
);
reset role;
select is(pg_temp.status_of(1, 'd4'), 'appealed', 'the refused confirmation leaves the appeal pending until the job');

select is(public.run_ride_jobs() -> 'lapsed', '2'::jsonb, 'the job lapses the two unconfirmed appeals');
select is(
  array[pg_temp.status_of(1, 'd4'), pg_temp.status_of(2, 'c3'), pg_temp.status_of(3, 'e5')],
  array['no_show', 'boarded', 'no_show'], 'lapsed appeals read as no-shows again; the confirmed one stays boarded'
);
select is(
  (select array_agg(note order by member_id) from public.ride_events where kind = 'appeal_lapsed'),
  array['counted', 'waived'], 'each lapse is logged with the restored outcome'
);
select is(pg_temp.counted('d4'), 1, 'an unconfirmed appeal counts after 72 hours');
select is(
  (select count(*) from public.reputation_events where user_id = pg_temp.u('c3') and kind = 'no_show'), 0::bigint,
  'a confirmed appeal stays removed after 72 hours'
);
select is(
  (select array_agg(waived order by created_at, id) from public.reputation_events where user_id = pg_temp.u('e5')),
  array[true, false], 'after the lapse the first no-show keeps the waiver and the second stays counted'
);
select is(pg_temp.counted('e5'), 1, 'the waiver count matches a history with no appeal');
select is(public.run_ride_jobs() -> 'lapsed', '0'::jsonb, 'a second run lapses nothing');

set local role authenticated;
select throws_ok(
  $$select pg_temp.as_user('d4', 'public.appeal_ride_no_show(pg_temp.r(1))')$$,
  '55000', 'invalid_transition', 'a lapsed appeal cannot be made again'
);
select throws_ok(
  $$select pg_temp.as_user('c3', 'public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u(''d4''))')$$,
  '55000', 'invalid_transition', 'a lapsed appeal cannot be confirmed'
);
reset role;
select is(
  (select array_agg(kind::text order by id) from public.ride_events where ride_id = pg_temp.r(1) and member_id = pg_temp.u('d4')),
  array['requested', 'approved', 'no_show', 'appealed', 'appeal_lapsed'], 'the lapse is the last event of the appeal'
);

select * from finish();
rollback;

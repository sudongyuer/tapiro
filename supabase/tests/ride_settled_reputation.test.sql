begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Dina'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');
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
  select ('44000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.as_user(k text, statement text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(pg_temp.u(k));
  execute 'select to_jsonb((' || statement || '))' into answer;
  return answer;
end;
$$;

create function pg_temp.departed(n integer, mode public.ride_split_mode, members text[], boarded text[]) returns void
language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
    now() + interval '20 minutes', 6, 'MYR', mode
  );
  foreach k in array members loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
    perform pg_temp.act_as(pg_temp.u('a1'));
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
  perform public.depart_ride(pg_temp.r(n), array(select pg_temp.u(b) from unnest(boarded) as b));
end;
$$;

create function pg_temp.payment_of(n integer, k text) returns uuid language sql security definer as $$
  select payment_id from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.stickers(n integer) returns uuid[] language sql security definer as $$
  select coalesce(array_agg(owner_id order by owner_id), '{}') from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(n);
$$;

create function pg_temp.events(n integer) returns text[] language sql security definer as $$
  select coalesce(array_agg(
    right(e.user_id::text, 2) || '>' || coalesce(right(e.counterpart_id::text, 2), 'gone')
      || case when e.payment_id is null then '' else ' paid' end
    order by right(e.user_id::text, 2), right(e.counterpart_id::text, 2)
  ), '{}')
  from public.reputation_events e
  where e.kind = 'settled' and e.item_kind = 'ride' and e.item_id = pg_temp.r(n);
$$;

create function pg_temp.snapshot(k text) returns jsonb language sql security definer as $$
  select jsonb_build_object('settled', s.settled_count, 'people', s.counterpart_count, 'tier', s.tier)
  from public.reputation_snapshots s where s.user_id = pg_temp.u(k);
$$;

select pg_temp.departed(1, 'grab', array['b2', 'c3', 'd4'], array['b2', 'c3']);
select public.reach_ride(pg_temp.r(1));

select is(
  pg_temp.events(1), array['a1>b2', 'a1>c3', 'b2>a1', 'c3>a1'],
  'a Grab-split close counts the organiser once per boarded rider and each rider once, without a payment'
);
select is(
  (select bool_and(on_time is null) from public.reputation_events where item_id = pg_temp.r(1) and kind = 'settled'),
  true, 'a ride without a payment has no on-time input'
);
select is(
  (select bool_and(e.created_at = r.settled_at)
   from public.reputation_events e join public.rides r on r.id = e.item_id
   where e.item_id = pg_temp.r(1) and e.kind = 'settled'),
  true, 'the rows are dated at the close'
);
select is(
  (select count(*) from public.reputation_events where user_id = pg_temp.u('d4') and kind = 'settled'), 0::bigint,
  'a no-show is not counted as settled'
);

select public.reach_ride(pg_temp.r(1));
select private.record_ride_settled(pg_temp.r(1));
select is(cardinality(pg_temp.events(1)), 4, 'counting a closed ride again adds nothing');

select pg_temp.as_user('d4', format('public.appeal_ride_no_show(%L)', pg_temp.r(1)));
select pg_temp.as_user('b2', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(1), pg_temp.u('d4')));
select is(
  pg_temp.events(1), array['a1>b2', 'a1>c3', 'a1>d4', 'b2>a1', 'c3>a1', 'd4>a1'],
  'an appeal confirmed after the close counts the appellant and the organiser'
);

select pg_temp.departed(2, 'tapiro', array['b2', 'c3'], array['b2']);
select public.reach_ride(pg_temp.r(2));
select public.send_ride_split(
  pg_temp.r(2), 6000, jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2000))
);
select pg_temp.as_user('c3', format('public.appeal_ride_no_show(%L)', pg_temp.r(2)));
select pg_temp.as_user('b2', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(2), pg_temp.u('c3')));
select pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(2, 'b2')));
select is(
  (select status::text from public.rides where id = pg_temp.r(2)), 'closed', 'the paid ride closes at its last settle'
);
select is(
  pg_temp.events(2), array['a1>b2 paid', 'a1>c3', 'b2>a1 paid', 'c3>a1'],
  'a paid pair keeps its payment rows and is not counted twice; a boarder without a share counts without a payment'
);
select is(
  pg_temp.stickers(2), array[pg_temp.u('a1'), pg_temp.u('b2')],
  'counting the late boarder gives them no sticker: the split stays as sent'
);

select pg_temp.departed(3, 'tapiro', array['e5'], array[]::text[]);
select pg_temp.act_as(pg_temp.u('a1'));
select public.reach_ride(pg_temp.r(3));
select is(pg_temp.events(3), array['a1>a1'], 'an organiser who rode alone counts one settled item');
select is(pg_temp.stickers(3), '{}'::uuid[], 'riding alone still earns no sticker');

select pg_temp.departed(4, 'grab', array[]::text[], array[]::text[]);
select public.reach_ride(pg_temp.r(4));
select public.recompute_reputation();
select is(
  pg_temp.snapshot('a1'), '{"settled": 7, "people": 3, "tier": "reliable"}'::jsonb,
  'lone rides add to settled but never to the distinct people'
);
select is(
  pg_temp.snapshot('c3'), '{"settled": 2, "people": 1, "tier": "new_friend"}'::jsonb,
  'two rides with one organiser are one person, paid or not'
);

select pg_temp.as_user('e5', format('public.appeal_ride_no_show(%L)', pg_temp.r(3)));
select pg_temp.as_user('a1', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(3), pg_temp.u('e5')));
select is(
  pg_temp.events(3), array['a1>e5', 'e5>a1'], 'an appeal after a lone close replaces the lone row with the pair'
);

select lives_ok(
  $$delete from auth.users where id in (pg_temp.u('b2'), pg_temp.u('c3'))$$,
  'two deleted riders of one ride do not collide on the pair index'
);
select is(
  pg_temp.events(1), array['a1>d4', 'a1>gone', 'a1>gone', 'd4>a1'],
  'the organiser keeps the deleted riders'' rows without a counterpart'
);
select public.recompute_reputation();
select is(
  pg_temp.snapshot('a1') -> 'people', '3'::jsonb, 'deleted riders count as one person (d4, e5 and the deleted)'
);

delete from public.reputation_events where item_id = pg_temp.r(4);
update public.rides set settled_at = now() - interval '200 days' where id = pg_temp.r(4);
select private.record_ride_settled(pg_temp.r(4));
select is(
  (select created_at from public.reputation_events where item_id = pg_temp.r(4) and kind = 'settled'),
  (select settled_at from public.rides where id = pg_temp.r(4)), 'a ride counted later keeps its close date for the 180-day window'
);

select is(
  (select private.ride_review_details_public()), false, 'ride review details stay private'
);

select * from finish();
rollback;

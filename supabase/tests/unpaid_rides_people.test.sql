begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', k)
from unnest(array['a1', 'b2', 'c3', 'd4', 'e5', 'f6']) as k;

update public.profiles set created_at = now() - interval '61 days';
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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
  perform public.reach_ride(pg_temp.r(n));
end;
$$;

create function pg_temp.snapshot(k text) returns jsonb language sql security definer as $$
  select jsonb_build_object(
    'settled', s.settled_count, 'people', s.counterpart_count, 'rate', s.completion_rate, 'tier', s.tier
  )
  from public.reputation_snapshots s where s.user_id = pg_temp.u(k);
$$;

select pg_temp.departed(1, 'grab', array['b2', 'c3', 'd4', 'e5', 'f6'], array['b2', 'c3', 'd4', 'e5', 'f6']);
select public.recompute_reputation();

select is(
  pg_temp.snapshot('a1'), '{"settled": 5, "people": 0, "rate": 1.0000, "tier": "new_friend"}'::jsonb,
  'five friends on one unpaid ride count five settled but no people, so the organiser reaches no tier'
);
select is(
  pg_temp.snapshot('b2'), '{"settled": 1, "people": 0, "rate": 1.0000, "tier": "new_friend"}'::jsonb,
  'a rider of an unpaid ride counts it as settled, without a person'
);

select pg_temp.departed(2, 'tapiro', array['b2', 'c3', 'd4', 'e5'], array['b2', 'c3', 'd4', 'e5']);
select public.send_ride_split(
  pg_temp.r(2), 8000,
  (select jsonb_agg(jsonb_build_object('memberId', pg_temp.u(k), 'minor', 2000)) from unnest(array['b2', 'c3', 'd4', 'e5']) k)
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.confirm_payment_received(m.payment_id)
from public.ride_members m where m.ride_id = pg_temp.r(2) and m.payment_id is not null;
select is(
  (select status::text from public.rides where id = pg_temp.r(2)), 'closed', 'the paid ride closes at its last settle'
);
select public.recompute_reputation();

select is(
  pg_temp.snapshot('a1'), '{"settled": 9, "people": 4, "rate": 1.0000, "tier": "very_reliable"}'::jsonb,
  'four paid riders count as four people; the unpaid ride still adds its five settled'
);
select is(
  pg_temp.snapshot('b2') - 'rate', '{"settled": 2, "people": 1, "tier": "new_friend"}'::jsonb,
  'a paid ride gives the rider the organiser as a person'
);

delete from auth.users where id = pg_temp.u('f6');
select public.recompute_reputation();
select is(
  pg_temp.snapshot('a1') -> 'people', '4'::jsonb, 'a deleted rider of an unpaid ride adds no person'
);

select * from finish();
rollback;

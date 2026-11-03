begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen')) v (k, n);

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
  select ('43000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

select pg_temp.departed(2, 'grab', array['b2', 'c3'], array['b2']);
select pg_temp.departed(3, 'tapiro', array['b2'], array[]::text[]);
select pg_temp.act_as(pg_temp.u('a1'));
select public.reach_ride(pg_temp.r(2));
select public.reach_ride(pg_temp.r(3));

set local role authenticated;

select is(pg_temp.stickers(2), array[pg_temp.u('a1'), pg_temp.u('b2')], 'a Grab-split close gives the boarded their stickers');
select pg_temp.as_user('c3', format('public.appeal_ride_no_show(%L)', pg_temp.r(2)));
select pg_temp.as_user('b2', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(2), pg_temp.u('c3')));
select is(
  pg_temp.stickers(2), array[pg_temp.u('a1'), pg_temp.u('b2'), pg_temp.u('c3')],
  'an appeal confirmed after a Grab-split close restores the appellant''s sticker, one each'
);

select is(pg_temp.stickers(3), '{}'::uuid[], 'an organiser who rode alone has no sticker');
select pg_temp.as_user('b2', format('public.appeal_ride_no_show(%L)', pg_temp.r(3)));
select pg_temp.as_user('a1', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(3), pg_temp.u('b2')));
select is(
  pg_temp.stickers(3), array[pg_temp.u('a1'), pg_temp.u('b2')],
  'an appeal confirmed after a lone close gives the appellant and the organiser one sticker each'
);

select * from finish();
rollback;

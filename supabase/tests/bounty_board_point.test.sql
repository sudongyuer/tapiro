begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty(
  id uuid, poster uuid, lat double precision default null, lng double precision default null
) returns uuid language sql as $$
  insert into public.bounties (
    id, poster_id, title, category, reward_minor, reward_currency, place, place_label, expires_at, status
  )
  values (
    id, poster, '帮取快递', 'pickup', 500, 'MYR',
    case when lat is not null then
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end,
    case when lat is not null then 'Sunway' end,
    now() + interval '7 days', 'open'
  )
  returning id;
$$;

create temp table results (name text primary key, r jsonb);
grant all on results to authenticated;

create function pg_temp.item(query text, bounty text) returns jsonb language sql as $$
  select e from jsonb_array_elements((select r -> 'items' from results where name = query)) as e
  where e ->> 'id' = bounty;
$$;

select pg_temp.bounty('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 3.07337, 101.60784);
select pg_temp.bounty('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.bounty('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d4', 3.07337, 101.60784);
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d4');
update public.bounties set art = 'parcel' where id = '60000000-0000-0000-0000-000000000001';

create temp table snapped as
select extensions.st_y(p) as latitude, extensions.st_x(p) as longitude
from (
  select extensions.st_snaptogrid(b.place::extensions.geometry, 0.001) as p
  from public.bounties b where b.id = '60000000-0000-0000-0000-000000000001'
) s;
grant select on snapped to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
insert into results select 'near', public.nearby_bounties(latitude => 3.0733, longitude => 101.6078);
insert into results select 'recent', public.nearby_bounties();

select is(
  array[pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'art',
    pg_temp.item('recent', '60000000-0000-0000-0000-000000000002') -> 'art'],
  array['"parcel"', 'null']::jsonb[], 'a board card carries its bounty''s art, null when none was chosen'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point') as k),
  array['latitude', 'longitude'], 'a placed bounty carries a point with latitude and longitude only'
);
select is(
  (pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point' ->> 'latitude')::double precision,
  (select latitude from snapped), 'the point latitude is the place snapped to 0.001°'
);
select is(
  (pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point' ->> 'longitude')::double precision,
  (select longitude from snapped), 'the point longitude is the place snapped to 0.001°'
);
select isnt(
  (pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point' ->> 'latitude')::double precision,
  3.07337::double precision, 'the point latitude is never the exact place'
);
select isnt(
  (pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point' ->> 'longitude')::double precision,
  101.60784::double precision, 'the point longitude is never the exact place'
);
select is(
  pg_temp.item('recent', '60000000-0000-0000-0000-000000000001') -> 'point',
  pg_temp.item('near', '60000000-0000-0000-0000-000000000001') -> 'point',
  'the board without a viewer point carries the same snapped point'
);
select is(
  pg_temp.item('near', '60000000-0000-0000-0000-000000000002') -> 'point', 'null'::jsonb,
  'a bounty without a place has a null point'
);
select is(
  pg_temp.item('recent', '60000000-0000-0000-0000-000000000002') -> 'point', 'null'::jsonb,
  'a bounty without a place has a null point on the board without a viewer point'
);
select is(
  pg_temp.item('near', '60000000-0000-0000-0000-000000000003'), null::jsonb,
  'a bounty by a blocked poster is absent from the board with a viewer point'
);
select is(
  pg_temp.item('recent', '60000000-0000-0000-0000-000000000003'), null::jsonb,
  'a bounty by a blocked poster is absent from the board without a viewer point'
);

select * from finish();
rollback;

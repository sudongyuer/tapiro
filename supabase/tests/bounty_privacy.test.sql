begin;
select plan(41);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p@example.com', '{"full_name":"Pat Wong"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h@example.com', '{"full_name":"Hana"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Aziz"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v@example.com', '{"full_name":"Vera"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Fong"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('60000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.bounty(
  n integer,
  lat double precision default null,
  lng double precision default null,
  age interval default '0',
  state public.bounty_status default 'open',
  helper uuid default null
) returns uuid language sql as $$
  insert into public.bounties (
    id, poster_id, helper_id, title, category, reward_minor, reward_currency, place, place_label, expires_at, status, created_at
  )
  values (
    pg_temp.b(n), pg_temp.u('a1'), helper, '帮取快递', 'pickup', 500, 'MYR',
    case when lat is not null then
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end,
    case when lat is not null then 'Sunway' end,
    now() + interval '7 days', state, now() - age
  )
  returning id;
$$;

create function pg_temp.here() returns extensions.geography language sql as $$
  select extensions.st_setsrid(extensions.st_makepoint(101.6078, 3.0733), 4326)::extensions.geography;
$$;

create function pg_temp.board(viewer text, size integer default 20, after jsonb default null, board_filter text default 'all')
returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(viewer));
  return public.nearby_bounties(
    latitude => 3.0733, longitude => 101.6078, board_filter => board_filter, page_after => after, page_size => size
  );
end;
$$;

create function pg_temp.detail(viewer text, n integer) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.bounty_detail(pg_temp.b(n)); end;
$$;

create function pg_temp.keys(x jsonb) returns text[] language sql as $$
  select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(x) as k;
$$;

create function pg_temp.cursors(viewer text, size integer) returns jsonb language plpgsql as $$
declare
  found_cursors jsonb := '[]';
  page jsonb;
  after jsonb;
begin
  for i in 1..20 loop
    page := pg_temp.board(viewer, size, after);
    after := page -> 'next';
    exit when after is null or after = 'null'::jsonb;
    found_cursors := found_cursors || jsonb_build_array(after);
  end loop;
  return found_cursors;
end;
$$;

create temp table distances as
select 0 as n, 0::double precision as d, 0::double precision as s where false;
grant all on distances to authenticated;

select pg_temp.bounty(1, 3.0740, 101.6078, '1 hour');
select pg_temp.bounty(2, 3.0733, 101.6078, '2 hours');
select pg_temp.bounty(3, 3.0671, 101.6036, '3 hours');
select pg_temp.bounty(4, 3.0657, 101.6110, '4 hours');
select pg_temp.bounty(5, age => '5 hours');
select pg_temp.bounty(6, age => '6 hours');
select pg_temp.bounty(7, 3.0733, 101.6078, state => 'assigned', helper => pg_temp.u('b2'));
update public.bounties set deadline_at = now() + interval '2 hours' where id = pg_temp.b(3);

insert into distances
select n, b.place operator(extensions.<->) pg_temp.here(), b.place_public operator(extensions.<->) pg_temp.here()
from generate_series(1, 7) as n
join public.bounties b on b.id = pg_temp.b(n)
where b.place is not null;

insert into public.bounty_applications (bounty_id, applicant_id, status)
values (pg_temp.b(2), pg_temp.u('c3'), 'pending');
insert into public.blocks (blocker_id, blocked_id)
values (pg_temp.u('e5'), pg_temp.u('a1')), (pg_temp.u('a1'), pg_temp.u('f6'));

select ok(
  (select d between 70 and 90 from distances where n = 1),
  'the bounty placed at 3.0740, 101.6078 is about 78 m from the viewer'
);

set local role authenticated;

select is(pg_temp.keys(pg_temp.detail('d4', 2) -> 'place'), array['label'], 'a viewer reads only the place label');
select is(
  pg_temp.detail('c3', 2) ->> 'viewerRole', 'applicant', 'the applicant reads the bounty as an applicant'
);
select is(pg_temp.keys(pg_temp.detail('c3', 2) -> 'place'), array['label'], 'an applicant reads only the place label');
select is(
  pg_temp.detail('a1', 2) -> 'place',
  '{"label": "Sunway", "latitude": 3.0733, "longitude": 101.6078}'::jsonb,
  'the poster reads the point'
);
select is(pg_temp.detail('b2', 7) ->> 'viewerRole', 'helper', 'the assigned helper reads the bounty as the helper');
select is(
  pg_temp.keys(pg_temp.detail('b2', 7) -> 'place'), array['label', 'latitude', 'longitude'],
  'the assigned helper reads the point'
);

select pg_temp.act_as(pg_temp.u('d4'));
select throws_ok(
  $$select place from public.bounties$$, '42501', null, 'a viewer cannot select the place column'
);
select throws_ok(
  $$select place_public from public.bounties$$, '42501', null, 'a viewer cannot select the snapped point either'
);
select throws_ok(
  $$select * from public.bounties$$, '42501', null, 'a viewer cannot select every column'
);
select is(
  (select place_label from public.bounties where id = pg_temp.b(2)), 'Sunway', 'a viewer still selects the place label'
);
select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  $$select place from public.bounties$$, '42501', null, 'the poster cannot select the place column directly either'
);

select ok(
  (select bool_and((item ->> 'distanceM')::integer % 100 = 0 and (item ->> 'distanceM')::integer >= 100)
   from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item
   where item -> 'distanceM' <> 'null'::jsonb),
  'every board distance is a multiple of 100 m and at least 100 m'
);
select is(
  (select count(*) from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item
   where item -> 'distanceM' <> 'null'::jsonb),
  4::bigint, 'the four located bounties carry a distance'
);
select is(
  (select (item ->> 'distanceM')::integer from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item
   where (item ->> 'id')::uuid = pg_temp.b(1)),
  100, 'a bounty 78 m away reads 100 m'
);
select is(
  (select (item ->> 'distanceM')::integer from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item
   where (item ->> 'id')::uuid = pg_temp.b(2)),
  100, 'a bounty at the viewer''s point reads 100 m'
);
select is(
  (select (item ->> 'distanceM')::integer from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item
   where (item ->> 'id')::uuid = pg_temp.b(3)),
  (select (round(s / 100) * 100)::integer from distances where n = 3),
  'a distance over 100 m is measured to the snapped point and rounded to the nearest 100 m'
);

select is(
  pg_temp.keys(pg_temp.board('d4', 2) -> 'next'), array['filter', 'id', 'kind', 'latitude', 'longitude'],
  'a distance cursor carries no distance'
);
select is(
  (select array_agg(c ->> 'kind' order by n)
   from jsonb_array_elements(pg_temp.cursors('d4', 1)) with ordinality as e(c, n)),
  array['distance', 'distance', 'distance', 'distance', 'recent'],
  'pages of 1 hand out distance cursors, then a recency cursor'
);
select is(
  (select count(*)
   from jsonb_array_elements(pg_temp.cursors('d4', 1)) as c,
        jsonb_each_text(c) as kv,
        distances x
   where kv.value ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$'
     and kv.value::double precision in (x.d, round(x.d), x.s, round(x.s))),
  0::bigint, 'no cursor value equals any row''s exact or snapped distance'
);
select is(
  (select array_agg(item ->> 'id' order by p, n)
   from jsonb_array_elements(
     jsonb_build_array(
       pg_temp.board('d4', 2) -> 'items',
       pg_temp.board('d4', 2, pg_temp.board('d4', 2) -> 'next') -> 'items'
     )
   ) with ordinality as pg(items, p),
   jsonb_array_elements(pg.items) with ordinality as e(item, n)),
  (select array_agg(item ->> 'id' order by n)
   from jsonb_array_elements(pg_temp.board('d4') -> 'items') with ordinality as e(item, n)
   where n <= 4),
  'the second distance page continues where the first ended'
);
select throws_ok(
  format(
    'select pg_temp.board(%L, 2, %L)', 'd4',
    (pg_temp.board('d4', 2) -> 'next') || jsonb_build_object('distance', '0')
  ),
  '22023', 'invalid_board_query', 'a crafted cursor with a distance is rejected'
);
select throws_ok(
  format(
    'select pg_temp.board(%L, 2, %L)', 'd4',
    (pg_temp.board('d4', 2) -> 'next') || jsonb_build_object('id', pg_temp.b(5))
  ),
  '22023', 'board_cursor_mismatch', 'a distance cursor on a bounty without a place is rejected'
);

select is(pg_temp.board('d4', 2) -> 'total', '6'::jsonb, 'the first page counts every match');
select ok(
  not (pg_temp.board('d4', 2, pg_temp.board('d4', 2) -> 'next') ? 'total'), 'a later page carries no total'
);
select is(
  pg_temp.board('d4', board_filter => 'urgent') -> 'total', '1'::jsonb, 'the total counts only the filter''s matches'
);

select is(
  (select array_agg(distinct array_to_string(pg_temp.keys(item -> 'poster'), ','))
   from jsonb_array_elements(pg_temp.board('d4') -> 'items') as item),
  array['id,name,tier'], 'each row carries the poster''s id, name and tier only'
);
select is(
  pg_temp.board('d4') -> 'items' -> 0 -> 'poster',
  jsonb_build_object('id', pg_temp.u('a1'), 'name', 'Pat Wong', 'tier', public.reputation_tier(pg_temp.u('a1'))),
  'the poster is the bounty''s poster'
);

select pg_temp.act_as(pg_temp.u('d4'));
select is(
  public.bounty_detail(pg_temp.b(1), 3.0733, 101.6078) -> 'distanceM', '100'::jsonb,
  'the detail rounds the distance from the given point'
);
select is(
  public.bounty_detail(pg_temp.b(1)) -> 'distanceM', 'null'::jsonb, 'the detail has no distance without a point'
);

select is(
  pg_temp.board('e5') -> 'items', '[]'::jsonb, 'a viewer who blocked the poster sees none of the poster''s bounties'
);
select is(
  pg_temp.board('f6') -> 'items', '[]'::jsonb, 'a viewer the poster blocked sees none of the poster''s bounties'
);
select is(
  pg_temp.board('f6') -> 'total', '0'::jsonb, 'a viewer the poster blocked counts none of the poster''s bounties'
);

reset role;
select pg_temp.bounty(8, 3.0734, 101.6084, '7 hours');
select pg_temp.bounty(9, 3.0726, 101.6076, '7 hours');
select pg_temp.bounty(10, 3.0726, 101.6076, state => 'assigned', helper => pg_temp.u('b2'));
create temp table probes as
select * from (values (3.0726, 101.6076), (3.0734, 101.6084), (3.0600, 101.5950), (3.0850, 101.6200), (3.0730, 101.6200))
  as v(lat, lng);
grant all on probes to authenticated;
create temp table pair as
select pr.lat, pr.lng, pt.n, pt.place operator(extensions.<->)
  extensions.st_setsrid(extensions.st_makepoint(pr.lng, pr.lat), 4326)::extensions.geography as d
from probes pr
cross join (select n, b.place from generate_series(8, 9) as n join public.bounties b on b.id = pg_temp.b(n)) pt;
select ok(
  exists (
    select 1 from pair a join pair c on (a.lat, a.lng) = (c.lat, c.lng)
    where a.n = 9 and c.n = 8 and a.d < c.d
  )
  and exists (
    select 1 from pair a join pair c on (a.lat, a.lng) = (c.lat, c.lng)
    where a.n = 9 and c.n = 8 and (round(a.d / 100) * 100) <> (round(c.d / 100) * 100)
  ),
  'the pair''s exact points reorder and round differently from some probe points'
);
select is(
  (select array_agg(distinct (place_public = (select place_public from public.bounties where id = pg_temp.b(8)))::text)
   from public.bounties where id = pg_temp.b(9)),
  array['true'], 'both bounties of the pair snap to the same grid point'
);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('d4'));
select is(
  (select array_agg(distinct format('%s,%s', p9.n - p8.n, (p8.item -> 'distanceM' = p9.item -> 'distanceM')::text))
   from probes pr
   cross join lateral (
     select public.nearby_bounties(latitude => pr.lat, longitude => pr.lng, page_size => 50) -> 'items' as items
   ) page
   cross join lateral (
     select e.item, e.n from jsonb_array_elements(page.items) with ordinality as e(item, n)
     where (e.item ->> 'id')::uuid = pg_temp.b(8)
   ) p8
   cross join lateral (
     select e.item, e.n from jsonb_array_elements(page.items) with ordinality as e(item, n)
     where (e.item ->> 'id')::uuid = pg_temp.b(9)
   ) p9),
  array['1,true'],
  'from every probe point the pair reads the same distance and stays tied in id order'
);
select is(
  (select array_agg(distinct
     (public.bounty_detail(pg_temp.b(8), pr.lat, pr.lng) -> 'distanceM'
       = public.bounty_detail(pg_temp.b(9), pr.lat, pr.lng) -> 'distanceM')::text)
   from probes pr),
  array['true'], 'a viewer''s detail reads the same distance for the pair from every probe point'
);
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.bounty_detail(pg_temp.b(9), 3.0730, 101.6200) -> 'distanceM', '1400'::jsonb,
  'the poster''s detail measures from the exact point (1378 m, snapped 1332 m)'
);
select pg_temp.act_as(pg_temp.u('b2'));
select is(
  public.bounty_detail(pg_temp.b(10), 3.0730, 101.6200) -> 'distanceM', '1400'::jsonb,
  'the assigned helper''s detail measures from the exact point'
);

reset role;
create temp table stale as select pg_temp.board('d4', 1) -> 'next' as cursor;
grant all on stale to authenticated;
update public.bounties set status = 'closed' where id = (select (cursor ->> 'id')::uuid from stale);
set local role authenticated;
select throws_ok(
  format('select pg_temp.board(%L, 1, %L)', 'd4', (select cursor from stale)),
  '22023', 'board_cursor_mismatch', 'a distance cursor on a bounty that is no longer open is rejected'
);

select pg_temp.act_as(null);
select throws_ok(
  $$select public.nearby_bounties()$$, '42501', 'not_authenticated', 'a caller without a user is rejected'
);

select * from finish();
rollback;

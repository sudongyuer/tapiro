begin;
select plan(52);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farid"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty(
  id uuid,
  poster uuid,
  lat double precision default null,
  lng double precision default null,
  age interval default '0',
  state public.bounty_status default 'open',
  helper uuid default null
) returns uuid language sql as $$
  insert into public.bounties (
    id, poster_id, helper_id, title, category, reward_minor, reward_currency, place, place_label, expires_at, status, done_at, created_at
  )
  values (
    id, poster, helper, '帮取快递', 'pickup', 500, 'MYR',
    case when lat is not null then
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end,
    case when lat is not null then 'Sunway' end,
    now() + interval '7 days', state,
    case when state in ('done', 'disputed') then now() end,
    now() - age
  )
  returning id;
$$;

create function pg_temp.ids(page jsonb) returns uuid[] language sql as $$
  select coalesce(array_agg((item ->> 'id')::uuid order by n), '{}')
  from jsonb_array_elements(page -> 'items') with ordinality as e(item, n);
$$;

create function pg_temp.walk(
  lat double precision, lng double precision, board_filter text, size integer
) returns jsonb language plpgsql as $$
declare
  pages jsonb := '[]';
  page jsonb;
  after jsonb;
begin
  for i in 1..60 loop
    page := public.nearby_bounties(
      latitude => lat, longitude => lng, board_filter => board_filter, page_after => after, page_size => size
    );
    pages := pages || jsonb_build_array(to_jsonb(pg_temp.ids(page)));
    after := page -> 'next';
    exit when after is null or after = 'null'::jsonb;
  end loop;
  return pages;
end;
$$;

create function pg_temp.flat(pages jsonb) returns uuid[] language sql as $$
  select coalesce(array_agg(id::uuid order by p, n), '{}')
  from jsonb_array_elements(pages) with ordinality as pg(page, p),
       jsonb_array_elements_text(pg.page) with ordinality as e(id, n);
$$;

create temp table results (name text primary key, r jsonb);
grant all on results to authenticated;

select pg_temp.bounty('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 3.0733, 101.6078, '30 minutes');
select pg_temp.bounty('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 3.0671, 101.6036, '4 hours');
select pg_temp.bounty('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', 3.0657, 101.6110, '6 hours');
select pg_temp.bounty('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 3.0657, 101.6110, '90 minutes');
select pg_temp.bounty('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 3.0657, 101.6110, '5 hours');
select pg_temp.bounty('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c3', 3.1183, 101.6078, '10 minutes');
select pg_temp.bounty('50000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', age => '1 hour');
select pg_temp.bounty('50000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000c3', age => '2 hours');
select pg_temp.bounty('50000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000a1', age => '2 hours');
select pg_temp.bounty('50000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000c3', age => '3 hours');

select pg_temp.bounty('50000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000b2', 3.0733, 101.6078);
select pg_temp.bounty('50000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-0000000000a1', 3.0733, 101.6078, state => 'closed');
select pg_temp.bounty('50000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-0000000000a1', 3.0733, 101.6078);
update public.bounties set expires_at = now() - interval '1 minute' where id = '50000000-0000-0000-0000-000000000023';
select pg_temp.bounty('50000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-0000000000d4', 3.0733, 101.6078);
select pg_temp.bounty('50000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-0000000000e5', 3.0733, 101.6078);
select pg_temp.bounty(
  '50000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-0000000000a1', 3.0733, 101.6078,
  state => 'assigned', helper => '00000000-0000-0000-0000-0000000000f6'
);

select pg_temp.bounty(
  '50000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-0000000000f6',
  state => 'assigned', helper => '00000000-0000-0000-0000-0000000000b2'
);
select pg_temp.bounty(
  '50000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-0000000000b2',
  state => 'done', helper => '00000000-0000-0000-0000-0000000000f6'
);
select pg_temp.bounty(
  '50000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000f6',
  state => 'confirmed', helper => '00000000-0000-0000-0000-0000000000b2'
);
update public.bounties set starts_at = now() + interval '5 hours', ends_at = now() + interval '6 hours'
where id = '50000000-0000-0000-0000-000000000031';
update public.bounties set starts_at = now() + interval '10 hours' where id = '50000000-0000-0000-0000-000000000032';
update public.bounties set starts_at = now() + interval '20 hours', ends_at = now() + interval '21 hours'
where id = '50000000-0000-0000-0000-000000000033';

update public.bounties set deadline_at = now() + interval '2 hours', expires_at = now() + interval '2 hours'
where id = '50000000-0000-0000-0000-000000000002';
update public.bounties set deadline_at = now() + interval '4 hours', expires_at = now() + interval '4 hours'
where id = '50000000-0000-0000-0000-000000000011';
update public.bounties set starts_at = now() + interval '5 hours 30 minutes', ends_at = now() + interval '7 hours'
where id = '50000000-0000-0000-0000-000000000003';
update public.bounties set starts_at = now() + interval '6 hours' where id = '50000000-0000-0000-0000-000000000004';
update public.bounties set starts_at = now() + interval '10 hours 30 minutes' where id = '50000000-0000-0000-0000-000000000012';
update public.bounties set starts_at = now() + interval '20 hours' where id = '50000000-0000-0000-0000-000000000013';

insert into public.bounty_addresses (bounty_id, address)
values ('50000000-0000-0000-0000-000000000001', '双威金字塔 LG2 层 12 号门口');
insert into public.bounty_applications (bounty_id, applicant_id, status)
values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'pending'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'withdrawn'),
  ('50000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-0000000000b2', 'pending');
insert into public.blocks (blocker_id, blocked_id)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d4'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b2');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
insert into results select 'near', public.nearby_bounties(latitude => 3.0733, longitude => 101.6078);
insert into results select 'recent', public.nearby_bounties();

select is(
  pg_temp.ids((select r from results where name = 'near')),
  array[
    '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000013',
    '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000014'
  ]::uuid[],
  'with a point: located by distance (ties by id), then unlocated by recency (ties by id descending)'
);
select is(
  (select array_agg((item ->> 'distanceM')::integer order by n)
   from jsonb_array_elements((select r -> 'items' from results where name = 'near')) with ordinality as e(item, n)
   where n <= 5) [1:1],
  array[100], 'a bounty at the viewer''s point reads 100 m, never 0'
);
select is(
  (select array_agg((item ->> 'distanceM')::integer order by item ->> 'id')
   from jsonb_array_elements((select r -> 'items' from results where name = 'near')) as item
   where item ->> 'id' in (
     '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003',
     '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006'
   )),
  array[800, 900, 900, 900],
  'Sunway University (832 m) and Sunway Geo (917 m) read in whole 100 m from Sunway Pyramid'
);
select is(
  (select (item ->> 'distanceM')::integer
   from jsonb_array_elements((select r -> 'items' from results where name = 'near')) as item
   where item ->> 'id' = '50000000-0000-0000-0000-000000000005'),
  5000, 'the point 0.045° north (5004 m) reads 5000 m'
);
select is(
  (select count(*) from jsonb_array_elements((select r -> 'items' from results where name = 'near')) as item
   where item ->> 'id' like '50000000-0000-0000-0000-00000000001%' and item -> 'distanceM' = 'null'::jsonb),
  4::bigint, 'unlocated bounties have no distance'
);
select is(
  (select r -> 'next' from results where name = 'near'), 'null'::jsonb, 'a single page has no next cursor'
);

select is(
  pg_temp.ids((select r from results where name = 'recent')),
  array[
    '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000012',
    '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006'
  ]::uuid[],
  'without a point: every bounty by recency, ties by id descending'
);
select is(
  (select count(*) from jsonb_array_elements((select r -> 'items' from results where name = 'recent')) as item
   where item -> 'distanceM' <> 'null'::jsonb),
  0::bigint, 'without a point no bounty has a distance'
);

select is(
  (select array_agg(k order by k) from jsonb_object_keys(
     (select r -> 'items' -> 0 from results where name = 'near')) as k),
  array[
    'appliedByMe', 'category', 'createdAt', 'deadlineAt', 'distanceM', 'endsAt', 'id', 'placeLabel', 'poster',
    'reference', 'rewardCurrency', 'rewardMinor', 'startsAt', 'stickerPath', 'title', 'urgent'
  ],
  'a card carries only the board fields'
);
select is(
  (select r -> 'items' -> 0 ->> 'placeLabel' from results where name = 'near'), 'Sunway',
  'the place label is returned'
);
reset role;
select is(
  (select count(*) from public.bounty_addresses where bounty_id = '50000000-0000-0000-0000-000000000001'), 1::bigint,
  'the first bounty does have an exact address'
);
select ok(
  (select position('双威金字塔' in r::text) = 0 and position('LG2' in r::text) = 0
   from public.nearby_bounties(latitude => 3.0733, longitude => 101.6078) as r),
  'the exact address is never returned, even to a caller whom RLS lets read it'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

select is(
  (select array_agg(item ->> 'id' order by item ->> 'id')
   from jsonb_array_elements((select r -> 'items' from results where name = 'near')) as item
   where (item ->> 'appliedByMe')::boolean),
  array['50000000-0000-0000-0000-000000000001'], 'only the pending application is marked applied, not the withdrawn one'
);
select is(
  (select array_agg(item ->> 'id' order by item ->> 'id')
   from jsonb_array_elements((select r -> 'items' from results where name = 'near')) as item
   where (item ->> 'urgent')::boolean),
  array['50000000-0000-0000-0000-000000000002'], 'only the bounty due within 3 hours is urgent'
);

select ok(
  not (pg_temp.ids((select r from results where name = 'near')) && array['50000000-0000-0000-0000-000000000021'::uuid])
  and not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000021'::uuid]),
  'the viewer''s own bounty is excluded'
);
select is(
  (select count(*) from public.bounties where id = '50000000-0000-0000-0000-000000000022'), 1::bigint,
  'the viewer can read the closed bounty they applied to'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'near')) && array['50000000-0000-0000-0000-000000000022'::uuid])
  and not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000022'::uuid]),
  'a closed bounty is excluded even when the viewer applied to it'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000023'::uuid]),
  'an expired open bounty is excluded'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000024'::uuid]),
  'a bounty by a user the viewer blocked is excluded'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000025'::uuid]),
  'a bounty by a user who blocked the viewer is excluded'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'recent')) && array['50000000-0000-0000-0000-000000000026'::uuid]),
  'an assigned bounty is excluded'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000f6');
insert into results select 'other', public.nearby_bounties(latitude => 3.0733, longitude => 101.6078);
select ok(
  pg_temp.ids((select r from results where name = 'other')) @> array[
    '50000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000024',
    '50000000-0000-0000-0000-000000000025'
  ]::uuid[],
  'another viewer sees the bounties hidden from the first viewer by ownership and blocks'
);
select ok(
  not (pg_temp.ids((select r from results where name = 'other')) && array[
    '50000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000023',
    '50000000-0000-0000-0000-000000000026'
  ]::uuid[]),
  'closed, expired and assigned bounties are hidden from everyone'
);
select is(
  (select count(*) from jsonb_array_elements((select r -> 'items' from results where name = 'other')) as item
   where (item ->> 'appliedByMe')::boolean),
  0::bigint, 'another viewer sees no applied flag from the first viewer''s application'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  pg_temp.ids(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, board_filter => 'urgent')),
  array['50000000-0000-0000-0000-000000000002']::uuid[], 'the urgent filter keeps bounties due within 3 hours'
);
select is(
  pg_temp.ids(public.nearby_bounties(board_filter => 'urgent')),
  array['50000000-0000-0000-0000-000000000002']::uuid[], 'the urgent filter works without a point'
);
select is(
  pg_temp.ids(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, board_filter => 'fits_my_time')),
  array[
    '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006',
    '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000011',
    '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000014'
  ]::uuid[],
  'fits my time drops bounties overlapping an active commitment as helper or poster; touching ends and settled work do not count'
);
select is(
  pg_temp.ids(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, board_filter => 'all')),
  pg_temp.ids((select r from results where name = 'near')), 'the all filter is the default'
);

select is(
  pg_temp.walk(3.0733, 101.6078, 'all', 4),
  jsonb_build_array(
    jsonb_build_array(
      '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
      '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004'
    ),
    jsonb_build_array(
      '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005',
      '50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000013'
    ),
    jsonb_build_array('50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000014')
  ),
  'pages of 4 with a point split a three-way distance tie, cross to unlocated and split a recency tie without gaps'
);
select is(
  pg_temp.flat(pg_temp.walk(3.0733, 101.6078, 'all', 2)),
  pg_temp.ids((select r from results where name = 'near')), 'pages of 2 with a point add up to the single page'
);
select is(
  pg_temp.flat(pg_temp.walk(3.0733, 101.6078, 'all', 1)),
  pg_temp.ids((select r from results where name = 'near')), 'pages of 1 with a point add up to the single page'
);
select is(
  pg_temp.walk(null, null, 'all', 5),
  jsonb_build_array(
    jsonb_build_array(
      '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000004',
      '50000000-0000-0000-0000-000000000013'
    ),
    jsonb_build_array(
      '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000014',
      '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003',
      '50000000-0000-0000-0000-000000000006'
    )
  ),
  'pages of 5 without a point split a recency tie without gaps'
);
select is(
  pg_temp.flat(pg_temp.walk(null, null, 'all', 1)),
  pg_temp.ids((select r from results where name = 'recent')), 'pages of 1 without a point add up to the single page'
);
select is(
  pg_temp.flat(pg_temp.walk(3.0733, 101.6078, 'fits_my_time', 2)),
  array[
    '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006',
    '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000011',
    '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000014'
  ]::uuid[],
  'a filter keeps its order across pages'
);
select is(
  jsonb_array_length(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078) -> 'items'), 10,
  'the default page holds all ten'
);

reset role;
select pg_temp.bounty(
  ('50000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000c3',
  3.0657, 101.6110, '8 hours'
)
from generate_series(12, 1, -1) as n;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  pg_temp.flat(pg_temp.walk(3.0733, 101.6078, 'all', 1)),
  pg_temp.ids(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 50)),
  'pages of 1 stay gap-free across a fifteen-way distance tie inserted in descending id order'
);
select is(
  cardinality(pg_temp.ids(public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 50))), 22,
  'the tie fixture adds twelve bounties'
);

select throws_ok(
  $$select public.nearby_bounties(latitude => 3.0733)$$, '22023', 'invalid_board_query',
  'a latitude without a longitude is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(latitude => 91, longitude => 101.6)$$, '22023', 'invalid_board_query',
  'a latitude out of range is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(board_filter => 'nearby')$$, '22023', 'invalid_board_query',
  'an unknown filter is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(page_size => 51)$$, '22023', 'invalid_board_query', 'a page over 50 is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(page_size => 0)$$, '22023', 'invalid_board_query', 'an empty page is rejected'
);
select throws_ok(
  format(
    'select public.nearby_bounties(page_after => %L)',
    public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 1) -> 'next'
  ),
  '22023', 'board_cursor_mismatch', 'a distance cursor without a point is rejected'
);
select throws_ok(
  format(
    'select public.nearby_bounties(latitude => 3.0657, longitude => 101.6110, page_after => %L)',
    public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 1) -> 'next'
  ),
  '22023', 'board_cursor_mismatch', 'a cursor from Sunway Pyramid is rejected at Sunway Geo'
);
select throws_ok(
  format(
    'select public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, board_filter => %L, page_after => %L)',
    'urgent', public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 1) -> 'next'
  ),
  '22023', 'board_cursor_mismatch', 'a cursor from another filter is rejected'
);
select throws_ok(
  format(
    'select public.nearby_bounties(page_after => %L)',
    public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_size => 19) -> 'next'
  ),
  '22023', 'board_cursor_mismatch', 'a recency cursor from a point session is rejected without the point'
);
select throws_ok(
  format(
    'select public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_after => %L)',
    public.nearby_bounties(page_size => 1) -> 'next'
  ),
  '22023', 'board_cursor_mismatch', 'a cursor from a session without a point is rejected with a point'
);
select throws_ok(
  $$select public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_after => '{"kind":"distance","createdAt":"2026-10-27T00:00:00Z","id":"50000000-0000-0000-0000-000000000001","latitude":3.0733,"longitude":101.6078,"filter":"all"}')$$,
  '22023', 'invalid_board_query', 'a distance cursor with a time is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(page_after => '{"kind":"recent","createdAt":"2026-10-27T00:00:00Z","id":"not-a-uuid","latitude":null,"longitude":null,"filter":"all"}')$$,
  '22023', 'invalid_board_query', 'a cursor with a malformed id is rejected'
);
select throws_ok(
  $$select public.nearby_bounties(latitude => 3.0733, longitude => 101.6078, page_after => '{"distance":"0","id":"50000000-0000-0000-0000-000000000001","latitude":3.0733,"longitude":101.6078,"filter":"all"}')$$,
  '22023', 'invalid_board_query', 'a cursor in the old shape with a distance is rejected'
);

reset role;
update public.bounties set deadline_at = now() + interval '3 hours', expires_at = now() + interval '3 hours'
where id = '50000000-0000-0000-0000-000000000006';
update public.bounties set deadline_at = now() + interval '3 hours 1 second', expires_at = now() + interval '4 hours'
where id = '50000000-0000-0000-0000-000000000004';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  pg_temp.ids(public.nearby_bounties(board_filter => 'urgent')),
  array['50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006']::uuid[],
  'urgent keeps a deadline exactly 3 hours away and drops one a second later'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.nearby_bounties()$$, '42501', 'permission denied for function nearby_bounties',
  'anon cannot call nearby_bounties'
);

select * from finish();
rollback;

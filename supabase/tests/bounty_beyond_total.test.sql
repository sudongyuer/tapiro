begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p@example.com', '{"full_name":"Pat Wong"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'q@example.com', '{"full_name":"Quinn"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v@example.com', '{"full_name":"Vera"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Ben"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('70000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.bounty(
  n integer,
  poster text,
  lat double precision default null,
  lng double precision default null,
  state public.bounty_status default 'open',
  expires interval default '7 days',
  starts interval default null,
  minutes integer default null
) returns uuid language sql as $$
  insert into public.bounties (
    id, poster_id, helper_id, title, category, reward_sen, place, place_label, expires_at, status, created_at,
    starts_at, ends_at
  )
  values (
    pg_temp.b(n), pg_temp.u(poster),
    case when state <> 'open' then pg_temp.u('d4') end, '帮取快递', 'pickup', 500,
    case when lat is not null then
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end,
    case when lat is not null then 'Sunway' end,
    now() + expires, state, now() - n * interval '1 minute',
    now() + starts, now() + starts + minutes * interval '1 minute'
  )
  returning id;
$$;

create function pg_temp.board(
  viewer text,
  size integer default 20,
  after jsonb default null,
  board_filter text default 'all',
  located boolean default true
) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(viewer));
  return public.nearby_bounties(
    latitude => case when located then 3.0733 end,
    longitude => case when located then 101.6078 end,
    board_filter => board_filter, page_after => after, page_size => size
  );
end;
$$;

create function pg_temp.far_rows(page jsonb) returns jsonb language sql as $$
  select to_jsonb(count(*)) from jsonb_array_elements(page -> 'items') as item
  where (item ->> 'distanceM')::integer > 2000;
$$;

select pg_temp.bounty(1, 'a1', 3.0740, 101.6078);
select pg_temp.bounty(2, 'a1', 3.0671, 101.6036);
select pg_temp.bounty(3, 'a1', 3.2000, 101.7000);
select pg_temp.bounty(4, 'a1', 3.0657, 101.6110);
select pg_temp.bounty(5, 'a1');
select pg_temp.bounty(6, 'a1');
select pg_temp.bounty(7, 'a1');
select pg_temp.bounty(8, 'b2', 3.1000, 101.6078);
select pg_temp.bounty(9, 'd4', 3.1000, 101.6100);
select pg_temp.bounty(10, 'a1', 3.0733, 101.6078, state => 'assigned', starts => '1 hour', minutes => 120);
select pg_temp.bounty(11, 'a1', 3.1000, 101.6078, expires => '-1 hour');
select pg_temp.bounty(12, 'a1', 3.1000, 101.6050);
select pg_temp.bounty(13, 'a1', 3.1100, 101.6078, starts => '2 hours', minutes => 30);
select pg_temp.bounty(14, 'a1', 3.0910, 101.6120);
update public.bounties set deadline_at = now() + interval '2 hours'
where id in (pg_temp.b(2), pg_temp.b(5), pg_temp.b(12));
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('d4'), pg_temp.u('b2'));

set local role authenticated;

select is(
  (select (item ->> 'distanceM')::integer from jsonb_array_elements(pg_temp.board('d4', 50) -> 'items') as item
   where (item ->> 'id')::uuid = pg_temp.b(14)),
  2000, 'the boundary bounty, 2023 m from the viewer, reads 2 km, inside the axis'
);
select is(
  pg_temp.board('d4', 2) -> 'beyondTotal', '3'::jsonb,
  'the first page counts the open, unexpired, unblocked located bounties of others beyond 2 km'
);
select is(
  pg_temp.board('d4', 2) -> 'beyondTotal', pg_temp.far_rows(pg_temp.board('d4', 50)),
  'the count equals the rows beyond 2 km of a page that holds every match'
);
select is(
  pg_temp.far_rows(pg_temp.board('d4', 2)), '0'::jsonb,
  'a first page of two holds no row beyond 2 km, yet the count already has every farther bounty'
);
select ok(
  not (pg_temp.board('d4', 2, pg_temp.board('d4', 2) -> 'next') ? 'beyondTotal'),
  'a later page carries no count'
);
select is(
  pg_temp.board('d4', board_filter => 'urgent') -> 'beyondTotal', '1'::jsonb,
  'the urgent filter counts only its farther bounties'
);
select is(
  pg_temp.board('d4', board_filter => 'fits_my_time') -> 'beyondTotal', '2'::jsonb,
  'fits my time drops the farther bounty that overlaps the viewer''s assigned slot'
);
select is(
  pg_temp.board('d4', 50, board_filter => 'fits_my_time') -> 'beyondTotal',
  pg_temp.far_rows(pg_temp.board('d4', 50, board_filter => 'fits_my_time')),
  'under fits my time the count still equals the farther rows'
);
select is(
  pg_temp.board('b2') -> 'beyondTotal', '3'::jsonb,
  'a user the viewer blocked counts none of the viewer''s farther bounties'
);
select is(
  pg_temp.board('e5') -> 'beyondTotal', '5'::jsonb,
  'an unrelated viewer counts every open farther bounty'
);
select ok(
  not (pg_temp.board('d4', located => false) ? 'beyondTotal') and pg_temp.board('d4', located => false) ? 'total',
  'without a point there is no farther count, only the total'
);

select * from finish();
rollback;

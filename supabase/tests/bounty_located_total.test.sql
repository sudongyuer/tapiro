begin;
select plan(9);

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

create function pg_temp.bounty(
  n integer,
  poster text,
  lat double precision default null,
  lng double precision default null,
  state public.bounty_status default 'open',
  expires interval default '7 days'
) returns uuid language sql as $$
  insert into public.bounties (
    id, poster_id, helper_id, title, category, reward_sen, place, place_label, expires_at, status, created_at
  )
  values (
    ('70000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, pg_temp.u(poster),
    case when state <> 'open' then pg_temp.u('d4') end, '帮取快递', 'pickup', 500,
    case when lat is not null then
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end,
    case when lat is not null then 'Sunway' end,
    now() + expires, state, now() - n * interval '1 minute'
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

select pg_temp.bounty(1, 'a1', 3.0740, 101.6078);
select pg_temp.bounty(2, 'a1', 3.0671, 101.6036);
select pg_temp.bounty(3, 'a1', 3.2000, 101.7000);
select pg_temp.bounty(4, 'a1', 3.0657, 101.6110);
select pg_temp.bounty(5, 'a1');
select pg_temp.bounty(6, 'a1');
select pg_temp.bounty(7, 'a1');
select pg_temp.bounty(8, 'b2', 3.0735, 101.6080);
select pg_temp.bounty(9, 'd4', 3.0733, 101.6078);
select pg_temp.bounty(10, 'a1', 3.0733, 101.6078, state => 'assigned');
select pg_temp.bounty(11, 'a1', 3.0733, 101.6078, expires => '-1 hour');
update public.bounties set deadline_at = now() + interval '2 hours'
where id in ('70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005');
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('d4'), pg_temp.u('b2'));

set local role authenticated;

select is(
  pg_temp.board('d4', 2) -> 'locatedTotal', '4'::jsonb,
  'the first page counts the open, unexpired, unblocked located bounties of others'
);
select is(
  pg_temp.board('d4', 2) -> 'locatedTotal',
  to_jsonb((select count(*) from jsonb_array_elements(pg_temp.board('d4', 50) -> 'items') as item
            where item -> 'distanceM' <> 'null'::jsonb)),
  'the located total equals the located rows of a page that holds every match'
);
select is(
  (pg_temp.board('d4', 2) ->> 'total')::integer - (pg_temp.board('d4', 2) ->> 'locatedTotal')::integer, 3,
  'the three bounties without a place count in the total but not in the located total'
);
select ok(
  not (pg_temp.board('d4', 2, pg_temp.board('d4', 2) -> 'next') ? 'locatedTotal'),
  'a later page carries no located total'
);
select is(
  pg_temp.board('d4', board_filter => 'urgent') -> 'locatedTotal', '1'::jsonb,
  'the located total counts only the filter''s located matches'
);
select is(
  pg_temp.board('d4', board_filter => 'urgent') -> 'total', '2'::jsonb,
  'the urgent filter still counts its bounty without a place in the total'
);
select is(
  pg_temp.board('b2') -> 'locatedTotal', '4'::jsonb,
  'a user the viewer blocked counts none of the viewer''s located bounties'
);
select is(
  pg_temp.board('e5') -> 'locatedTotal', '6'::jsonb,
  'an unrelated viewer counts every open located bounty'
);
select is(
  pg_temp.board('d4', located => false) -> 'locatedTotal', '4'::jsonb,
  'the located total does not depend on the viewer sharing a point'
);

select * from finish();
rollback;

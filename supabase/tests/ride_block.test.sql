begin;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli'), ('f6', 'Fay'),
  ('a7', 'Gus')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('32000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

create function pg_temp.ride_with(n integer, members text[], requesters text[]) returns void
language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'Mid Valley Megamall', '谷中城', 3.1180, 101.6770,
    now() + interval '10 minutes', 6, 'MYR'
  );
  foreach k in array members || requesters loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
  end loop;
  perform pg_temp.act_as(pg_temp.u('a1'));
  foreach k in array members loop
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
end;
$$;

create function pg_temp.status_of(n integer, k text) returns text language sql as $$
  select status::text from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.block(k text, target text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(k));
  perform public.block_user(pg_temp.u(target));
end;
$$;

create function pg_temp.no_shows(k text) returns bigint language sql as $$
  select count(*) from public.reputation_events where user_id = pg_temp.u(k) and kind = 'no_show';
$$;

select pg_temp.ride_with(1, array['b2', 'c3', 'e5'], array['d4']);
select pg_temp.ride_with(2, array['f6', 'a7'], array[]::text[]);
select pg_temp.as_user('a1', $$public.depart_ride(pg_temp.r(2), array[pg_temp.u('f6')])$$);


select pg_temp.block('a1', 'b2');
select is(pg_temp.status_of(1, 'b2'), 'left', 'the organiser blocking an accepted member ends the membership');
select pg_temp.block('c3', 'a1');
select is(pg_temp.status_of(1, 'c3'), 'left', 'a member blocking the organiser ends the membership');
select pg_temp.block('a1', 'd4');
select is(pg_temp.status_of(1, 'd4'), 'withdrawn', 'a blocked applicant''s application is withdrawn');
select is(
  pg_temp.as_user('a1', $$public.ride_detail(pg_temp.r(1))$$) ->> 'taken', '2',
  'both seats free up inside the 15-minute window'
);

select results_eq(
  $$select kind::text, member_id, note from public.ride_events
    where ride_id = pg_temp.r(1) and kind in ('left', 'withdrawn') order by id$$,
  $$values ('left', '00000000-0000-0000-0000-0000000000b2'::uuid, 'blocked'),
    ('left', '00000000-0000-0000-0000-0000000000c3'::uuid, 'blocked'),
    ('withdrawn', '00000000-0000-0000-0000-0000000000d4'::uuid, 'blocked')$$,
  'each ended membership is logged once'
);

select is(
  pg_temp.as_user('a1', $$public.depart_ride(pg_temp.r(1), array[pg_temp.u('e5')])$$) -> 'noShows', '[]'::jsonb,
  '出发 after the blocks records no hidden no-show'
);
select is(
  array[pg_temp.status_of(1, 'b2'), pg_temp.status_of(1, 'c3'), pg_temp.status_of(1, 'e5')],
  array['left', 'left', 'boarded'], 'the ended memberships stay ended at 出发'
);
select is(pg_temp.no_shows('b2') + pg_temp.no_shows('c3'), 0::bigint, 'a block is not a leave: no no-show is recorded, at the block or at 出发');

select pg_temp.block('f6', 'a1');
select pg_temp.block('a1', 'a7');
select is(
  array[pg_temp.status_of(2, 'f6'), pg_temp.status_of(2, 'a7')], array['boarded', 'no_show'],
  'a block after 出发 changes no membership'
);
select is(
  (select array_agg(m ->> 'name' order by m ->> 'name')
   from jsonb_array_elements(pg_temp.as_user('a1', $$public.ride_detail(pg_temp.r(2))$$) -> 'members') as x(m)),
  array['Alice', 'Fay', 'Gus'], 'the organiser still sees members blocked after 出发'
);
select is(pg_temp.as_user('a7', $$public.appeal_ride_no_show(pg_temp.r(2))$$), '{"status": "appealed"}'::jsonb,
  'a member blocked after 出发 can still appeal');
select is(pg_temp.as_user('a7', $$public.ride_detail(pg_temp.r(2))$$) ->> 'role', 'noShow',
  'and still reads their own appeal state');
select is(pg_temp.as_user('a1', $$public.confirm_ride_appeal(pg_temp.r(2), pg_temp.u('a7'))$$),
  '{"status": "boarded"}'::jsonb, 'the organiser can confirm that appeal');
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(2))$$) ->> 'status', 'arrived', '到了 after the blocks');
select is(
  pg_temp.as_user('a1', format('public.send_ride_split(pg_temp.r(2), 3000, %L::jsonb)', jsonb_build_array(
    jsonb_build_object('memberId', pg_temp.u('f6'), 'minor', 1000),
    jsonb_build_object('memberId', pg_temp.u('a7'), 'minor', 1000)
  ))) ->> 'status', 'settling', 'the split covers both blocked riders'
);
select is(
  (select count(*) from public.ride_members where ride_id = pg_temp.r(2) and payment_id is not null and member_id <> pg_temp.u('a1')),
  2::bigint, 'one payment each'
);
select is(pg_temp.status_of(2, 'f6'), 'boarded', 'the rider who blocked stays boarded');

select * from finish();
rollback;

begin;
select plan(30);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli'), ('f6', 'Fay'))
  v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('31000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

create function pg_temp.detail(k text, n integer) returns jsonb language sql as $$
  select pg_temp.as_user(k, format('public.ride_detail(%L::uuid)', pg_temp.r(n)));
$$;

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  pg_temp.r(1), 'Sunway Geo Residences', '双威', 3.07331, 101.60782, 'KLIA2', 'KLIA2', 2.7456, 101.6865,
  now() + interval '20 minutes', 3, 'MYR'
);
select pg_temp.act_as(pg_temp.u('b2'));
select public.request_ride(pg_temp.r(1), '我有一个箱子');
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride(pg_temp.r(1), '24 寸箱子可以吗？');
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride(pg_temp.r(1));
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request(pg_temp.r(1), pg_temp.u('b2'), true);
select public.update_ride_details(pg_temp.r(1), 'VEN 2381', null, '大堂门口');
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('f6'), pg_temp.u('a1'));

set local role authenticated;

select is(pg_temp.detail('a1', 1) ->> 'role', 'organiser', 'the organiser reads the detail as organiser');
select is(jsonb_array_length(pg_temp.detail('a1', 1) -> 'requests'), 2, 'the organiser sees both requests');
select is(
  pg_temp.detail('a1', 1) -> 'requests' -> 0 ->> 'note', '24 寸箱子可以吗？', 'with the applicant''s note'
);
select is(
  (select array_agg(m ->> 'name' order by n) from jsonb_array_elements(pg_temp.detail('a1', 1) -> 'members') with ordinality as x(m, n)),
  array['Alice', 'Bob'], 'members list the organiser first'
);
select is(pg_temp.detail('a1', 1) -> 'members' -> 0 ->> 'organiser', 'true', 'and mark the organiser');
select is(pg_temp.detail('a1', 1) -> 'details' ->> 'plate', 'VEN 2381', 'the organiser reads the plate');
select is(
  (pg_temp.detail('a1', 1) -> 'startPoint' ->> 'latitude')::numeric, 3.07331, 'the organiser gets the exact start point'
);

select is(pg_temp.detail('b2', 1) ->> 'role', 'member', 'an accepted member reads as member');
select is(pg_temp.detail('b2', 1) -> 'details' ->> 'meetingNote', '大堂门口', 'a member reads 集合说明');
select is(jsonb_array_length(pg_temp.detail('b2', 1) -> 'members'), 2, 'a member sees the members');
select is(pg_temp.detail('b2', 1) -> 'requests', 'null'::jsonb, 'a member does not see requests');
select is(pg_temp.detail('b2', 1) ->> 'myNote', null, 'a member''s old note is not echoed');

select is(pg_temp.detail('c3', 1) ->> 'role', 'applicant', 'a requester reads as applicant');
select is(pg_temp.detail('c3', 1) ->> 'myNote', '24 寸箱子可以吗？', 'with their own note');
select is(pg_temp.detail('c3', 1) -> 'members', 'null'::jsonb, 'an applicant does not see members');
select is(pg_temp.detail('c3', 1) -> 'details', 'null'::jsonb, 'nor 车牌 and 集合说明');

select is(pg_temp.detail('e5', 1) ->> 'role', 'viewer', 'anyone else reads as viewer');
select is((pg_temp.detail('e5', 1) ->> 'taken')::integer, 2, 'a viewer sees how many seats are taken');
select is(
  (pg_temp.detail('e5', 1) -> 'startPoint' ->> 'latitude')::numeric, 3.073, 'a viewer gets the snapped start point'
);
select is(pg_temp.detail('e5', 1) -> 'organiser' ->> 'name', 'Alice', 'a viewer sees the organiser');
select throws_ok($$select pg_temp.detail('f6', 1)$$, 'P0002', 'ride_not_found', 'someone who blocked the organiser cannot read it');
select throws_ok(
  format('select pg_temp.detail(%L, 99)', 'e5'), 'P0002', 'ride_not_found', 'an unknown ride is not found'
);

select pg_temp.as_user('b2', $$public.mark_ride_arrived(pg_temp.r(1))$$);
select pg_temp.as_user('a1', $$public.decide_ride_request(pg_temp.r(1), pg_temp.u('c3'), true)$$);
select pg_temp.as_user('c3', $$public.report_ride_late(pg_temp.r(1), 5)$$);
select isnt(
  (select m ->> 'lateAt' from jsonb_array_elements(pg_temp.detail('b2', 1) -> 'members') as x(m) where m ->> 'name' = 'Chen'),
  null, 'a late member carries when they said so'
);
select isnt(pg_temp.detail('b2', 1) ->> 'fullAt', null, 'a full ride carries when it filled');
select isnt(
  (select m ->> 'arrivedAt' from jsonb_array_elements(pg_temp.detail('a1', 1) -> 'members') as x(m) where m ->> 'name' = 'Bob'),
  null, 'arrivals show to the organiser'
);

select pg_temp.as_user('a1', $$public.depart_ride(pg_temp.r(1), array[pg_temp.u('b2')])$$);
select throws_ok($$select pg_temp.detail('e5', 1)$$, 'P0002', 'ride_not_found', 'a departed ride is gone for viewers');
select is(pg_temp.detail('c3', 1) ->> 'role', 'noShow', 'the unticked member reads as noShow');
select is(pg_temp.detail('c3', 1) -> 'members', 'null'::jsonb, 'and no longer sees the members');
select pg_temp.as_user('c3', $$public.appeal_ride_no_show(pg_temp.r(1))$$);
select is(
  (select m ->> 'status' from jsonb_array_elements(pg_temp.detail('b2', 1) -> 'members') as x(m) where m ->> 'name' = 'Chen'),
  'appealed', 'a boarded member sees the pending appeal'
);
select ok(
  (pg_temp.detail('c3', 1) ->> 'appealEndsAt')::timestamptz > now() + interval '71 hours',
  'the appeal window ends 72 h after 出发'
);

select * from finish();
rollback;

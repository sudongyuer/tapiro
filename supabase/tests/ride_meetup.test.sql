begin;
select plan(41);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

create function pg_temp.ride_with(n integer, departs interval, members text[], requesters text[]) returns void
language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'Mid Valley Megamall', '谷中城', 3.1180, 101.6770,
    now() + departs, 6, 'MYR'
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

select pg_temp.ride_with(1, interval '20 minutes', array['b2', 'c3', 'd4'], array['e5']);
select pg_temp.ride_with(2, interval '3 hours', array['b2'], array[]::text[]);

set local role authenticated;

select throws_ok($$select pg_temp.as_user('b2', 'public.mark_ride_arrived(pg_temp.r(2))')$$, '55000', 'invalid_transition', '我到了 waits for 集合');
select isnt(pg_temp.as_user('b2', $$public.mark_ride_arrived(pg_temp.r(1))$$) ->> 'arrivedAt', null, 'a member taps 我到了 at 集合');
create temp table first_arrival as select pg_temp.as_user('b2', $$public.mark_ride_arrived(pg_temp.r(1))$$) as answer;
select is(
  (select answer ->> 'arrivedAt' from first_arrival)::timestamptz,
  (select arrived_at from public.ride_members where ride_id = pg_temp.r(1) and member_id = pg_temp.u('b2')),
  'a second 我到了 keeps the first time'
);
select throws_ok($$select pg_temp.as_user('e5', 'public.mark_ride_arrived(pg_temp.r(1))')$$, '42501', 'not_member', 'a requester cannot tap 我到了');
select is(pg_temp.as_user('a1', $$public.mark_ride_arrived(pg_temp.r(1))$$) ->> 'arrivedAt' is not null, true, 'the organiser taps 我到了 too');
select is(pg_temp.as_user('b2', $$public.undo_ride_arrived(pg_temp.r(1))$$), '{"arrivedAt": null}'::jsonb, '我到了 can be undone');
select is(
  (select arrived_at from public.ride_members where ride_id = pg_temp.r(1) and member_id = pg_temp.u('b2')), null,
  'undo clears the arrival time'
);
select is(pg_temp.as_user('b2', $$public.undo_ride_arrived(pg_temp.r(1))$$), '{"arrivedAt": null}'::jsonb, 'undoing twice answers the first');
select isnt(pg_temp.as_user('b2', $$public.mark_ride_arrived(pg_temp.r(1))$$) ->> 'arrivedAt', null, '我到了 again after the undo');

create temp table late_answer as
select (pg_temp.as_user('c3', $$public.report_ride_late(pg_temp.r(1), 10)$$) ->> 'lateUntil')::timestamptz as until;
select ok(
  (select until from late_answer) between now() + interval '9 minutes 59 seconds' and now() + interval '10 minutes 1 second',
  '晚到 10 分钟 sets the time ten minutes ahead'
);
select throws_ok($$select pg_temp.as_user('c3', 'public.report_ride_late(pg_temp.r(1), 7)')$$, '22023', 'invalid_ride', 'only 5, 10 or 15 minutes');
select throws_ok($$select pg_temp.as_user('b2', 'public.report_ride_late(pg_temp.r(1), 5)')$$, '55000', 'invalid_transition', 'someone who arrived cannot report late');
select is(pg_temp.as_user('d4', $$public.report_ride_late(pg_temp.r(1), 15)$$) ->> 'lateUntil' is not null, true, 'another member reports late');
select is(pg_temp.as_user('d4', $$public.report_ride_late(pg_temp.r(1), null)$$), '{"lateUntil": null}'::jsonb, '晚到 can be cleared');

reset role;
select results_eq(
  $$select kind::text, member_id from public.ride_events where ride_id = pg_temp.r(1) and kind in ('arrived', 'arrival_undone', 'late') order by id$$,
  $$values ('arrived', '00000000-0000-0000-0000-0000000000b2'::uuid), ('arrived', '00000000-0000-0000-0000-0000000000a1'::uuid),
    ('arrival_undone', '00000000-0000-0000-0000-0000000000b2'::uuid), ('arrived', '00000000-0000-0000-0000-0000000000b2'::uuid),
    ('late', '00000000-0000-0000-0000-0000000000c3'::uuid), ('late', '00000000-0000-0000-0000-0000000000d4'::uuid),
    ('late', '00000000-0000-0000-0000-0000000000d4'::uuid)$$,
  'arrivals, undo and late are logged once each'
);
set local role authenticated;

select throws_ok($$select pg_temp.as_user('b2', 'public.revise_ride_time(pg_temp.r(1), now() + interval ''1 hour'')')$$, '42501', 'not_organiser', 'only the organiser moves the time');
select is(pg_temp.as_user('a1', $$public.revise_ride_time(pg_temp.r(1), now() + interval '25 minutes')$$) ->> 'status', 'gathering', 'a short delay stays at 集合');
select ok(
  (select revised_at > depart_at from public.rides where id = pg_temp.r(1)), 'the old time is kept for the strike-through'
);
select throws_ok($$select pg_temp.as_user('a1', 'public.revise_ride_time(pg_temp.r(1), now() - interval ''1 minute'')')$$, '22023', 'invalid_ride', 'a past time is refused');
select throws_ok($$select pg_temp.as_user('a1', 'public.revise_ride_time(pg_temp.r(1), now() + interval ''21 minutes'')')$$, '22023', 'invalid_ride', 'a time earlier than the current one is refused');

select is(
  pg_temp.as_user('a1', $$public.update_ride_details(pg_temp.r(1), ' VEN 2381 · 白色 Alza ', null, '大堂门口')$$),
  '{"plate": "VEN 2381 · 白色 Alza", "eta": null, "meetingNote": "大堂门口"}'::jsonb, 'the organiser fills 车牌 and 集合说明'
);
select pg_temp.act_as(pg_temp.u('c3'));
select is((select plate from public.ride_details where ride_id = pg_temp.r(1)), 'VEN 2381 · 白色 Alza', 'members read the plate');
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', format('public.update_ride_details(pg_temp.r(1), %L)', repeat('A', 41))),
  '22023', 'invalid_ride', 'a 41-character plate is refused'
);
select throws_ok($$select pg_temp.as_user('b2', 'public.update_ride_details(pg_temp.r(1), ''X'')')$$, '42501', 'not_organiser', 'only the organiser fills the plate');
select is(pg_temp.as_user('a1', $$public.set_ride_split_mode(pg_temp.r(1), 'grab')$$), '{"splitMode": "grab"}'::jsonb, 'the split mode changes before 出发');
select is(pg_temp.as_user('a1', $$public.set_ride_split_mode(pg_temp.r(1), 'tapiro')$$), '{"splitMode": "tapiro"}'::jsonb, 'and back');

select throws_ok($$select pg_temp.as_user('b2', 'public.depart_ride(pg_temp.r(1), array[]::uuid[])')$$, '42501', 'not_organiser', 'only the organiser taps 出发');
select throws_ok($$select pg_temp.as_user('a1', 'public.depart_ride(pg_temp.r(2), array[]::uuid[])')$$, '55000', 'invalid_transition', '出发 waits for 集合');
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.depart_ride(pg_temp.r(1), array[pg_temp.u(''b2''), pg_temp.u(''e5'')])')$$,
  '22023', 'invalid_ride', 'only accepted members can be ticked'
);
select is(
  pg_temp.as_user('a1', $$public.depart_ride(pg_temp.r(1), array[pg_temp.u('b2'), pg_temp.u('c3')])$$),
  jsonb_build_object('status', 'departed', 'boarded', 3, 'noShows', jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('d4'), 'noShow', 'waived'))),
  '出发 boards the ticked members and the organiser; the unticked one is a no-show'
);
select is(
  array[pg_temp.status_of(1, 'a1'), pg_temp.status_of(1, 'b2'), pg_temp.status_of(1, 'c3'), pg_temp.status_of(1, 'd4'), pg_temp.status_of(1, 'e5')],
  array['boarded', 'boarded', 'boarded', 'no_show', 'requested'], 'member states after 出发'
);
select is(
  pg_temp.as_user('a1', $$public.depart_ride(pg_temp.r(1), array[]::uuid[])$$) -> 'boarded', '3'::jsonb, 'a replayed 出发 answers the first'
);
select throws_ok($$select pg_temp.as_user('b2', 'public.undo_ride_arrived(pg_temp.r(1))')$$, '42501', 'not_member', '我到了 cannot be undone after 出发');
select throws_ok($$select pg_temp.as_user('a1', 'public.set_ride_split_mode(pg_temp.r(1), ''grab'')')$$, '55000', 'departed', 'the split mode is fixed after 出发');
select is(
  pg_temp.as_user('a1', $$public.update_ride_details(pg_temp.r(1), 'VEN 2381', now() + interval '40 minutes', '大堂门口')$$) ->> 'plate',
  'VEN 2381', '车牌 and 预计到 still change after 出发'
);

select throws_ok($$select pg_temp.as_user('b2', 'public.appeal_ride_no_show(pg_temp.r(1))')$$, '42501', 'not_member', 'a boarded member has nothing to appeal');
select is(pg_temp.as_user('d4', $$public.appeal_ride_no_show(pg_temp.r(1))$$), '{"status": "appealed"}'::jsonb, 'an unticked member taps 我上车了');
reset role;
select is(
  (select count(*) from public.reputation_events where user_id = pg_temp.u('d4') and kind = 'no_show'), 0::bigint,
  'an appeal is not counted while it waits'
);
set local role authenticated;
select throws_ok($$select pg_temp.as_user('d4', 'public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u(''d4''))')$$, '42501', 'not_member', 'nobody confirms their own appeal');
select is(pg_temp.as_user('c3', $$public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u('d4'))$$), '{"status": "boarded"}'::jsonb, 'any boarded member confirms in one tap');
select is(pg_temp.as_user('b2', $$public.confirm_ride_appeal(pg_temp.r(1), pg_temp.u('d4'))$$), '{"status": "boarded"}'::jsonb, 'a second confirmation answers the first');

select * from finish();
rollback;

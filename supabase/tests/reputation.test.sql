begin;
select plan(69);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('first', gen_random_uuid()), ('second', gen_random_uuid()), ('again', gen_random_uuid()),
  ('mixed', gen_random_uuid()), ('restored', gen_random_uuid());

select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'first')),
  'waived', 'the first no-show is waived'
);
select is(
  (select waived from public.reputation_events where item_id = (select id from ids where name = 'first')), true,
  'the waived no-show is stored as waived'
);
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000a1', 'ride', (select id from ids where name = 'second')),
  'counted', 'a second no-show inside 60 days counts'
);
select is(
  (select waived from public.reputation_events where item_id = (select id from ids where name = 'second')), false,
  'the counted no-show is stored as not waived'
);
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'first')),
  'waived', 'replaying the waived no-show returns waived'
);
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000a1', 'ride', (select id from ids where name = 'second')),
  'counted', 'replaying the counted no-show returns counted'
);
select is(
  (select count(*) from public.reputation_events where user_id = '00000000-0000-0000-0000-0000000000a1'), 2::bigint,
  'replays write nothing'
);

insert into public.reputation_events (user_id, kind, item_kind, item_id, waived, created_at)
values ('00000000-0000-0000-0000-0000000000b2', 'no_show', 'bounty', gen_random_uuid(), true, now() - interval '61 days');
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000b2', 'bounty', (select id from ids where name = 'again')),
  'waived', 'a waiver older than 60 days is available again'
);

insert into public.reputation_events (user_id, kind, item_kind, item_id, waived, created_at)
values
  ('00000000-0000-0000-0000-0000000000c3', 'no_show', 'bounty', '00000000-0000-4000-8000-0000000000c1', true, now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000c3', 'no_show', 'bounty', gen_random_uuid(), false, now() - interval '10 days');
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000c3', 'bounty', (select id from ids where name = 'mixed')),
  'counted', 'a waiver used 30 days ago is not restored by a later counted no-show'
);
update public.reputation_events set created_at = now() - interval '61 days'
where item_id = '00000000-0000-4000-8000-0000000000c1';
select is(
  public.record_no_show('00000000-0000-0000-0000-0000000000c3', 'bounty', (select id from ids where name = 'restored')),
  'waived', 'once the waived one is 61 days old a new no-show is waived even after counted ones'
);

select throws_ok(
  $$select public.record_no_show(null, 'bounty', gen_random_uuid())$$,
  '22023', 'invalid_no_show', 'a no-show needs an offender'
);
select throws_ok(
  $$select public.record_no_show('00000000-0000-0000-0000-0000000000a1', null, gen_random_uuid())$$,
  '22023', 'invalid_no_show', 'a no-show needs an item kind'
);
select throws_ok(
  $$select public.record_no_show('00000000-0000-0000-0000-0000000000a1', 'bounty', null)$$,
  '22023', 'invalid_no_show', 'a no-show needs an item'
);
select throws_ok(
  $$select public.record_no_show('00000000-0000-0000-0000-00000000dead', 'bounty', gen_random_uuid())$$,
  'P0002', 'user_not_found', 'a no-show by an unknown user is rejected'
);
select throws_ok(
  $$insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
    values ('00000000-0000-0000-0000-0000000000a1', 'settled', 'bounty', gen_random_uuid(), true)$$,
  '23514', null, 'only a no-show can be waived'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.record_no_show('00000000-0000-0000-0000-0000000000b2', 'bounty', gen_random_uuid())$$,
  '42501', null, 'a client cannot record a no-show'
);
select throws_ok(
  $$select count(*) from public.reputation_events$$,
  '42501', null, 'a client cannot read reputation events'
);
reset role;
select is(
  has_table_privilege('authenticated', 'public.reputation_events', 'select'), false,
  'authenticated holds no select on reputation events'
);

insert into ids values
  ('paid', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 1200)),
  ('late', public.open_payment('bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 800)),
  ('orphan', public.open_payment('ride', gen_random_uuid(), '拼车回 YC', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 850));
update public.payments
set created_at = now() - interval '2 days', marked_paid_at = now() - interval '1 day', method_type = 'cash',
    state = 'settled', settled_at = now()
where id in (select id from ids where name in ('paid', 'orphan'));
update public.payments
set created_at = now() - interval '5 days', marked_paid_at = now() - interval '1 day', method_type = 'cash',
    state = 'settled', settled_at = now()
where id = (select id from ids where name = 'late');

select private.record_settled((select id from ids where name = 'paid'));
select is(
  (select count(*) from public.reputation_events where payment_id = (select id from ids where name = 'paid')), 2::bigint,
  'a settled forward payment records one event per side'
);
select is(
  (select row(kind::text, counterpart_id, on_time) from public.reputation_events
   where payment_id = (select id from ids where name = 'paid') and user_id = '00000000-0000-0000-0000-0000000000b2'),
  row('settled'::text, '00000000-0000-0000-0000-0000000000a1'::uuid, null::boolean),
  'the payee''s event names the payer and has no on-time flag'
);
select is(
  (select row(kind::text, counterpart_id, on_time) from public.reputation_events
   where payment_id = (select id from ids where name = 'paid') and user_id = '00000000-0000-0000-0000-0000000000a1'),
  row('settled'::text, '00000000-0000-0000-0000-0000000000b2'::uuid, true),
  'the payer''s event names the payee and is on time within 72 hours'
);
select is(
  (select item_id from public.reputation_events
   where payment_id = (select id from ids where name = 'paid') and user_id = '00000000-0000-0000-0000-0000000000a1'),
  (select item_id from public.payments where id = (select id from ids where name = 'paid')),
  'the event points at the payment''s item'
);
select private.record_settled((select id from ids where name = 'paid'));
select is(
  (select count(*) from public.reputation_events where payment_id = (select id from ids where name = 'paid')), 2::bigint,
  'recording the same settle again adds nothing'
);

insert into ids values ('reverse', public.open_reverse_payment((select id from ids where name = 'paid')));
update public.payments set state = 'settled', settled_at = now(), method_type = 'cash'
where id = (select id from ids where name = 'reverse');
select private.record_settled((select id from ids where name = 'reverse'));
select is(
  (select count(*) from public.reputation_events where payment_id = (select id from ids where name = 'reverse')),
  0::bigint, 'a reverse payment records nothing'
);

select private.record_settled((select id from ids where name = 'late'));
select is(
  (select on_time from public.reputation_events
   where payment_id = (select id from ids where name = 'late') and user_id = '00000000-0000-0000-0000-0000000000c3'),
  false, 'a payer who marked paid 4 days after the payment opened is late'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';
select private.record_settled((select id from ids where name = 'orphan'));
select is(
  (select count(*) from public.reputation_events where payment_id = (select id from ids where name = 'orphan')),
  1::bigint, 'a payment whose payer was deleted records only the payee''s event'
);
select is(
  (select row(user_id, counterpart_id) from public.reputation_events
   where payment_id = (select id from ids where name = 'orphan')),
  row('00000000-0000-0000-0000-0000000000b2'::uuid, null::uuid),
  'the payee''s event has no counterpart once the payer is gone'
);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000b2', 'cash');
insert into ids values
  ('client', public.open_payment('bounty', gen_random_uuid(), '帮带饭', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 700));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.confirm_payment_received((select id from ids where name = 'client'));
reset role;
select results_eq(
  $$select user_id, counterpart_id from public.reputation_events
    where payment_id = (select id from ids where name = 'client') and kind = 'settled' order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-0000000000b2'::uuid),
           ('00000000-0000-0000-0000-0000000000b2'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'a client settle records the settled event of both sides'
);
select is(
  (select on_time from public.reputation_events
   where payment_id = (select id from ids where name = 'client') and user_id = '00000000-0000-0000-0000-0000000000a1'),
  null::boolean, 'a cash payment the payer never marked paid leaves on-time unknown'
);

insert into ids values ('ride', gen_random_uuid());
insert into ids values
  ('rider_a', public.open_payment('ride', (select id from ids where name = 'ride'), '拼车回 YC', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900)),
  ('rider_c', public.open_payment('ride', (select id from ids where name = 'ride'), '拼车回 YC', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 900));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.confirm_payment_received((select id from ids where name = 'rider_a'));
select public.confirm_payment_received((select id from ids where name = 'rider_c'));
reset role;
select results_eq(
  $$select counterpart_id from public.reputation_events
    where user_id = '00000000-0000-0000-0000-0000000000b2' and kind = 'settled'
      and item_id = (select id from ids where name = 'ride')
    order by counterpart_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000c3'::uuid)$$,
  'a driver with two riders on one ride gets one settled event per rider'
);
select is(
  (select count(*) from public.reputation_events
   where item_id = (select id from ids where name = 'ride') and kind = 'settled'),
  4::bigint, 'each rider payment records both sides'
);
select throws_ok(
  $$insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
    values ('00000000-0000-0000-0000-0000000000a1', 'no_show', 'bounty', (select id from ids where name = 'first'), false)$$,
  '23505', null, 'a user holds at most one no-show per item'
);

select is(
  has_function_privilege('authenticated', 'private.record_settled(uuid)', 'execute'), false,
  'a client cannot record a settle'
);
select is(
  has_function_privilege('service_role', 'public.record_no_show(uuid, public.payment_item_kind, uuid)', 'execute'), true,
  'the service role records no-shows'
);
select is(
  has_function_privilege('anon', 'public.record_no_show(uuid, public.payment_item_kind, uuid)', 'execute'), false,
  'anon cannot record a no-show'
);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'u' || n || '@example.com', json_build_object('full_name', 'User ' || n)::jsonb
from unnest(array['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
  '111', '112', '113', '114', '115', '116', '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '213']) as n;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-000000000' || n)::uuid;
$$;

create function pg_temp.settle(subject text, times integer, counterparts integer, age interval default '0',
  on_time boolean default null) returns void language sql as $$
  insert into public.reputation_events (user_id, kind, item_kind, item_id, counterpart_id, on_time, created_at)
  select pg_temp.u(subject), 'settled', 'bounty', gen_random_uuid(), pg_temp.u((201 + i % counterparts)::text),
    on_time, now() - age
  from generate_series(0, times - 1) as i;
$$;

create function pg_temp.no_show(subject text, waived boolean) returns void language sql as $$
  insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
  values (pg_temp.u(subject), 'no_show', 'bounty', gen_random_uuid(), waived);
$$;

create function pg_temp.tier(n text) returns text language sql as $$
  select tier::text from public.reputation_snapshots where user_id = pg_temp.u(n);
$$;

select pg_temp.settle('101', 2, 2);
select pg_temp.settle('102', 2, 1);
select pg_temp.settle('103', 3, 2);
select pg_temp.no_show('103', true);
select pg_temp.settle('104', 2, 2, '0', true);
select pg_temp.settle('104', 1, 1, '0', false);
select pg_temp.no_show('104', false);
select pg_temp.no_show('104', false);
select pg_temp.settle('105', 1, 1);
select pg_temp.settle('105', 1, 2, '179 days');
select pg_temp.settle('106', 1, 1);
select pg_temp.settle('106', 1, 2, '181 days');
update public.reputation_events set counterpart_id = pg_temp.u('202')
where user_id in (pg_temp.u('105'), pg_temp.u('106')) and created_at < now() - interval '1 day';
select pg_temp.settle('107', 9, 4);
select pg_temp.no_show('107', false);
select pg_temp.settle('108', 9, 4);
select pg_temp.no_show('108', false);
select pg_temp.settle('109', 12, 8);
select pg_temp.settle('110', 12, 8);
insert into public.reputation_events (user_id, kind, item_kind, item_id, counterpart_id)
select pg_temp.u(subject), 'settled', 'bounty', gen_random_uuid(), pg_temp.u(counterpart)
from (values ('111', '209'), ('111', '210'), ('112', '211'), ('112', '212'), ('112', '213')) as v (subject, counterpart);
delete from auth.users where id in (pg_temp.u('210'), pg_temp.u('212'), pg_temp.u('213'));
select pg_temp.settle('113', 5, 4);
select pg_temp.settle('114', 4, 4);
select pg_temp.settle('115', 4, 2);
select pg_temp.no_show('115', false);
select pg_temp.settle('116', 19, 8);
select pg_temp.no_show('116', false);
update public.profiles set created_at = now() - interval '60 days' where id in (pg_temp.u('113'), pg_temp.u('114'));
update public.profiles set created_at = now() - interval '180 days' where id = pg_temp.u('116');
update public.profiles set created_at = now() - interval '59 days' where id = pg_temp.u('107');
update public.profiles set created_at = now() - interval '60 days' where id = pg_temp.u('108');
update public.profiles set created_at = now() - interval '180 days' where id = pg_temp.u('109');
update public.profiles set created_at = now() - interval '179 days' where id = pg_temp.u('110');

select is(public.reputation_tier(pg_temp.u('100'))::text, 'new_friend', 'a user without a snapshot is new_friend');
select is(
  (select count(*) from public.reputation_snapshots where user_id = pg_temp.u('100')), 0::bigint,
  'no snapshot exists before the first recompute'
);
select is(
  public.recompute_reputation(), (select count(*)::integer from public.profiles),
  'a recompute writes one row per profile'
);
select is(
  (select row(tier::text, settled_count, completion_rate, on_time_share) from public.reputation_snapshots
   where user_id = pg_temp.u('100')),
  row('new_friend'::text, 0, null::numeric, null::numeric),
  'a user with no events is new_friend with no completion rate'
);
select is(pg_temp.tier('101'), 'reliable', '2 settled with 2 counterparts is reliable');
select is(pg_temp.tier('102'), 'new_friend', '2 settled with one counterpart stays new_friend');
select is(pg_temp.tier('103'), 'reliable', 'a waived no-show does not lower the completion rate');
select is(pg_temp.tier('104'), 'new_friend', 'two counted no-shows against 3 settled drop reliable');
select is(
  (select row(settled_count, counterpart_count, counted_no_shows, completion_rate, on_time_share)
   from public.reputation_snapshots where user_id = pg_temp.u('104')),
  row(3, 2, 2, 0.6000::numeric, 0.6667::numeric),
  'the snapshot stores the counts, the completion rate and the on-time share'
);
select is(pg_temp.tier('105'), 'reliable', 'an event 179 days old counts');
select is(pg_temp.tier('106'), 'new_friend', 'an event 181 days old does not count');
select is(pg_temp.tier('107'), 'reliable', '9 settled, 4 counterparts, rate 0.9 on a 59-day account stays reliable');
select is(pg_temp.tier('108'), 'very_reliable', 'the same on a 60-day account is very_reliable');
select is(pg_temp.tier('109'), 'tapir_friend', '12 settled with 8 counterparts on a 180-day account is tapir_friend');
select is(pg_temp.tier('110'), 'very_reliable', 'the same on a 179-day account stays very_reliable');
select is(public.reputation_tier(pg_temp.u('108'))::text, 'very_reliable', 'reputation_tier reads the snapshot');
select is(pg_temp.tier('113'), 'very_reliable', '5 settled with 4 counterparts on a 60-day account is very_reliable');
select is(pg_temp.tier('114'), 'reliable', '4 settled on a 60-day account stays reliable');
select is(pg_temp.tier('115'), 'reliable', 'a completion rate of exactly 0.8 is reliable');
select is(pg_temp.tier('116'), 'tapir_friend', 'a completion rate of exactly 0.95 on a 180-day account is tapir_friend');
select is(pg_temp.tier('111'), 'reliable', 'a counterpart who deleted their account still counts');
select is(
  (select counterpart_count from public.reputation_snapshots where user_id = pg_temp.u('112')), 2,
  'counterparts who deleted their accounts count together as one'
);

select public.recompute_reputation(now() + interval '2 days');
select is(pg_temp.tier('105'), 'new_friend', 'a later as_of drops events that left the 180-day window');
select is(
  (select computed_at from public.reputation_snapshots where user_id = pg_temp.u('105')), now() + interval '2 days',
  'the replaced snapshot carries the new as_of'
);
select public.recompute_reputation();

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select tier::text from public.reputation_snapshots where user_id = pg_temp.u('101')), 'reliable',
  'a signed-in client reads another user''s tier'
);
select is(public.reputation_tier(pg_temp.u('109'))::text, 'tapir_friend', 'a client reads a tier through the function');
select throws_ok(
  $$select settled_count from public.reputation_snapshots$$,
  '42501', null, 'a client cannot read the counts behind a tier'
);
select throws_ok(
  $$insert into public.reputation_snapshots (user_id, tier, settled_count, counterpart_count, counted_no_shows, computed_at)
    values ('00000000-0000-0000-0000-0000000000a1', 'tapir_friend', 99, 99, 0, now())$$,
  '42501', null, 'a client cannot insert a snapshot'
);
select throws_ok(
  $$update public.reputation_snapshots set tier = 'tapir_friend'$$,
  '42501', null, 'a client cannot update a snapshot'
);
select throws_ok(
  $$select public.recompute_reputation()$$,
  '42501', null, 'a client cannot run the recompute'
);
reset role;
select is(
  (select tier::text from public.reputation_snapshots where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'new_friend', 'the client insert and update changed nothing'
);
select is(
  has_function_privilege('anon', 'public.reputation_tier(uuid)', 'execute'), false,
  'anon cannot read a tier'
);
select is(
  has_function_privilege('service_role', 'public.recompute_reputation(timestamptz)', 'execute'), true,
  'the service role runs the recompute'
);
select is(
  (select row(schedule, command) from cron.job where jobname = 'reputation-recompute-daily'),
  row('30 19 * * *'::text, 'select public.recompute_reputation()'::text),
  'the recompute runs daily at 03:30 Malaysia time'
);

select * from finish();
rollback;

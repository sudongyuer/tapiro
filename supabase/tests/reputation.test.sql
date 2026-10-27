begin;
select plan(31);

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

select * from finish();
rollback;

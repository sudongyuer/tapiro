begin;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

insert into public.payee_methods (id, user_id, type, phone, display_name)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'duitnow_id', '+60123456789', 'BOB LIM');
insert into public.payee_methods (id, user_id, type, qr_payload, display_name)
values ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-0000000000b2', 'alipay', 'https://qr.alipay.com/x', 'BOB LIM');
insert into public.payee_methods (id, user_id, type)
values ('00000000-0000-4000-8000-0000000000b9', '00000000-0000-0000-0000-0000000000b2', 'cash');
insert into public.payee_methods (id, user_id, type, phone, display_name)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-0000000000c3', 'duitnow_id', '+60198765432', 'CHEN');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('one', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 1500, 'MYR')),
  ('two', public.open_payment('bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 800, 'MYR'));

create function pg_temp.reported(method uuid) returns timestamptz language sql security definer as $$
  select reported_at from public.payee_methods where id = method;
$$;

create function pg_temp.cant_pay_events() returns text[] language sql security definer as $$
  select coalesce(array_agg(e.recipient::text || ' ' || e.subject_id::text order by e.id), '{}') from public.events e
  where e.kind = 'payment.cant_pay';
$$;

select ok(
  (select push from private.event_kinds where kind = 'payment.cant_pay'), '付不了 is a push kind'
);
select ok(
  not has_function_privilege('anon', 'public.report_cant_pay(uuid, uuid)', 'execute'), 'anon cannot report'
);
select ok(
  has_function_privilege('authenticated', 'public.report_cant_pay(uuid, uuid)', 'execute'), 'a signed-in user can report'
);
select ok(
  not has_column_privilege('authenticated', 'public.payee_methods', 'reported_at', 'update'),
  'no client writes reported_at directly'
);

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')$$,
  '42501', null, 'the payee cannot report their own method'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')$$,
  'P0002', null, 'a stranger cannot report on someone else''s payment'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000c1')$$,
  'P0002', null, 'the method must be the payee''s'
);
select throws_ok(
  $$select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b9')$$,
  'P0002', null, 'cash cannot be reported'
);
select is(pg_temp.reported('00000000-0000-4000-8000-0000000000b1'), null, 'nothing reported yet');

select lives_ok(
  $$select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')$$,
  'the payer reports 付不了'
);
select isnt(pg_temp.reported('00000000-0000-4000-8000-0000000000b1'), null, 'the method is marked reported');
select is(
  (select reported_at is not null from public.payee_methods where id = '00000000-0000-4000-8000-0000000000b1'),
  true, 'the payer reads the report on the method they pay to'
);
select is(
  pg_temp.cant_pay_events(),
  array['00000000-0000-0000-0000-0000000000b2 ' || (select id from ids where name = 'one')::text],
  'the payee is told once, about this payment'
);

select lives_ok(
  $$select public.report_cant_pay((select id from ids where name = 'two'), '00000000-0000-4000-8000-0000000000b1')$$,
  'a second report on the same method succeeds'
);
select is(cardinality(pg_temp.cant_pay_events()), 1, 'a method already reported does not push again');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select reported_at is not null from public.payee_methods where id = '00000000-0000-4000-8000-0000000000b1'),
  true, 'the payee reads the report on their list'
);
select public.set_default_payee_method('00000000-0000-4000-8000-0000000000b1');
select isnt(pg_temp.reported('00000000-0000-4000-8000-0000000000b1'), null, 'making it the default keeps the report');
update public.payee_methods set display_name = 'BOB LIM' where id = '00000000-0000-4000-8000-0000000000b1';
select isnt(pg_temp.reported('00000000-0000-4000-8000-0000000000b1'), null, 'saving the same details keeps the report');
update public.payee_methods set phone = '+60123456780' where id = '00000000-0000-4000-8000-0000000000b1';
select is(pg_temp.reported('00000000-0000-4000-8000-0000000000b1'), null, 'changing the number clears the report');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.report_cant_pay((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b3');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
update public.payee_methods set checked_at = clock_timestamp() where id = '00000000-0000-4000-8000-0000000000b3';
select is(pg_temp.reported('00000000-0000-4000-8000-0000000000b3'), null, '没问题 (a new check time) clears the report');

reset role;
update public.payments set state = 'marked_paid', marked_paid_at = now(), method_type = 'duitnow_id',
  paid_minor = 800, paid_currency = 'MYR'
where id = (select id from ids where name = 'two');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.report_cant_pay((select id from ids where name = 'two'), '00000000-0000-4000-8000-0000000000b1')$$,
  '55000', null, 'only a payment still due can be reported'
);

select * from finish();
rollback;

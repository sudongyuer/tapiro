begin;
select plan(25);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name":"Bob Lim"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.payee_methods (id, type, phone, display_name)
    values ('00000000-0000-4000-8000-000000000001', 'duitnow_id', '+60123456789', 'ALICE TAN')$$,
  'owner adds a DuitNow phone'
);
select is((select is_default from public.payee_methods where id = '00000000-0000-4000-8000-000000000001'), true, 'first method becomes the default');
select is((select user_id from public.payee_methods where id = '00000000-0000-4000-8000-000000000001'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'user_id defaults to the caller');

select lives_ok(
  $$insert into public.payee_methods (id, type, bank_code, account_number, display_name)
    values ('00000000-0000-4000-8000-000000000002', 'bank_account', '588734', '1234567890', 'ALICE TAN')$$,
  'owner adds a bank account'
);
select is((select is_default from public.payee_methods where id = '00000000-0000-4000-8000-000000000002'), false, 'second method is not the default');
select lives_ok(
  $$insert into public.payee_methods (id, type, qr_payload, acquirer_id, mcc, qr_name)
    values ('00000000-0000-4000-8000-000000000003', 'duitnow_qr', '00020101021126...6304ABCD', '890053', '0000', 'ALICE TAN')$$,
  'owner adds a DuitNow QR'
);
select lives_ok(
  $$insert into public.payee_methods (id, type) values ('00000000-0000-4000-8000-000000000004', 'cash')$$,
  'owner turns cash on'
);
select throws_ok(
  $$insert into public.payee_methods (type) values ('cash')$$,
  '23505', null, 'only one cash row per user'
);
select throws_ok(
  $$insert into public.payee_methods (type, phone, display_name) values ('duitnow_id', '+6512345678', 'X')$$,
  '23514', null, 'non-Malaysian phone is rejected'
);
select throws_ok(
  $$insert into public.payee_methods (type, phone) values ('duitnow_id', '+60123456789')$$,
  '23514', null, 'DuitNow phone needs the bank name'
);
select throws_ok(
  $$insert into public.payee_methods (type, qr_payload, phone) values ('alipay', 'https://qr.alipay.com/x', '+60123456789')$$,
  '23514', null, 'fields of another type are rejected'
);
select throws_ok(
  $$insert into public.payee_methods (type, is_default, qr_payload) values ('alipay', true, 'https://qr.alipay.com/x')$$,
  '42501', null, 'is_default is not writable by clients'
);
select throws_ok(
  $$update public.payee_methods set is_default = true where id = '00000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'is_default is not updatable by clients'
);

select lives_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000002')$$,
  'owner changes the default'
);
select is(
  (select array_agg(id order by id) from public.payee_methods where is_default),
  array['00000000-0000-4000-8000-000000000002'::uuid],
  'exactly one default after the change'
);
select throws_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000004')$$,
  'P0002', null, 'cash cannot be the default'
);

select lives_ok(
  $$update public.payee_methods set qr_payload = '00020101021126...6304EEEE' where id = '00000000-0000-4000-8000-000000000003'$$,
  'owner re-picks a QR'
);

select lives_ok(
  $$delete from public.payee_methods where id = '00000000-0000-4000-8000-000000000002'$$,
  'owner deletes the default'
);
select is(
  (select id from public.payee_methods where is_default),
  '00000000-0000-4000-8000-000000000001'::uuid,
  'the oldest remaining transfer method becomes the default'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

select is((select count(*) from public.payee_methods), 0::bigint, 'another user reads none of them');
select throws_ok(
  $$insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash')$$,
  '42501', null, 'another user cannot insert for the owner'
);
select throws_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000003')$$,
  'P0002', null, 'another user cannot change the default'
);
delete from public.payee_methods where id = '00000000-0000-4000-8000-000000000001';

reset role;
select is((select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000a1'), 3::bigint, 'another user deleted nothing');

set local role anon;
select throws_ok($$select * from public.payee_methods$$, '42501', null, 'anon cannot read payee methods');

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'payee methods cascade with the auth user');

select * from finish();
rollback;

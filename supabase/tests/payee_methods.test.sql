begin;
select plan(46);

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
  $$insert into public.payee_methods (type, qr_payload) values ('alipay', 'https://qr.alipay.com/x')$$,
  '23514', null, 'an Alipay code needs the name the wallet shows'
);
select throws_ok(
  $$insert into public.payee_methods (type, qr_payload, display_name) values ('wechat', 'wxp://f2f0abc', '   ')$$,
  '23514', null, 'a blank wallet name is rejected'
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
  $$insert into public.payee_methods (id, type, bank_name, account_number, display_name)
    values ('00000000-0000-4000-8000-000000000005', 'bank_account', 'Bank Rakyat', '9876543210', 'ALICE TAN')$$,
  'owner adds a bank that is not in the picker by name'
);
select throws_ok(
  $$insert into public.payee_methods (type, bank_code, bank_name, account_number, display_name)
    values ('bank_account', '588734', 'Maybank', '9876543210', 'ALICE TAN')$$,
  '23514', null, 'a bank account has a code or a name, not both'
);
select throws_ok(
  $$insert into public.payee_methods (type, account_number, display_name)
    values ('bank_account', '9876543210', 'ALICE TAN')$$,
  '23514', null, 'a bank account needs a code or a name'
);

reset role;
set local session_replication_role = replica;
update public.payee_methods set checked_at = now() - interval '100 days' where id = '00000000-0000-4000-8000-000000000003';
set local session_replication_role = origin;
set local role authenticated;
select lives_ok(
  $$update public.payee_methods set qr_name = 'ALICE T' where id = '00000000-0000-4000-8000-000000000003'$$,
  'owner edits a QR without changing the string'
);
select ok(
  (select checked_at < now() - interval '99 days' from public.payee_methods where id = '00000000-0000-4000-8000-000000000003'),
  'checked_at stays when the QR string is unchanged'
);
select lives_ok(
  $$update public.payee_methods set qr_payload = '00020101021126...6304EEEE' where id = '00000000-0000-4000-8000-000000000003'$$,
  'owner re-picks a QR'
);
select is(
  (select checked_at from public.payee_methods where id = '00000000-0000-4000-8000-000000000003'),
  now(),
  'a new QR string refreshes checked_at'
);
reset role;
set local session_replication_role = replica;
update public.payee_methods set checked_at = now() - interval '100 days' where id = '00000000-0000-4000-8000-000000000003';
set local session_replication_role = origin;
set local role authenticated;
select lives_ok(
  $$update public.payee_methods set checked_at = '2000-01-01' where id = '00000000-0000-4000-8000-000000000003'$$,
  'owner confirms the same QR'
);
select is(
  (select checked_at from public.payee_methods where id = '00000000-0000-4000-8000-000000000003'),
  now(),
  'a client-sent checked_at becomes the server time'
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

select lives_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000003')$$,
  'the QR becomes the default'
);
select lives_ok(
  $$select public.replace_payee_qr('00000000-0000-4000-8000-000000000003', 'alipay', 'https://qr.alipay.com/fkx1', null, null, null, 'ALICE TAN')$$,
  'owner replaces the DuitNow QR with an Alipay code'
);
select is(
  (select display_name from public.payee_methods where type = 'alipay'),
  'ALICE TAN',
  'the replacement stores the wallet name'
);
select is(
  (select type::text from public.payee_methods where is_default),
  'alipay',
  'the replacement keeps the default'
);
select is(
  (select count(*) from public.payee_methods where id = '00000000-0000-4000-8000-000000000003'),
  0::bigint,
  'the old QR row is gone'
);
select throws_ok(
  $$select public.replace_payee_qr('00000000-0000-4000-8000-000000000001', 'alipay', 'https://qr.alipay.com/x')$$,
  'P0002', null, 'a phone method cannot be replaced by a QR'
);
select lives_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000001')$$,
  'the phone becomes the default again'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

select is((select count(*) from public.payee_methods), 0::bigint, 'another user reads none of them');
select throws_ok(
  $$insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash')$$,
  '42501', null, 'another user cannot insert for the owner'
);
select throws_ok(
  $$select public.set_default_payee_method('00000000-0000-4000-8000-000000000001')$$,
  'P0002', null, 'another user cannot change the default'
);
select results_eq(
  $$with changed as (update public.payee_methods set display_name = 'MALLORY' where id = '00000000-0000-4000-8000-000000000001' returning 1)
    select count(*)::int from changed$$,
  $$values (0)$$,
  'another user''s update changes no rows'
);
select results_eq(
  $$with removed as (delete from public.payee_methods where id = '00000000-0000-4000-8000-000000000001' returning 1)
    select count(*)::int from removed$$,
  $$values (0)$$,
  'another user''s delete removes no rows'
);
select throws_ok(
  $$select public.replace_payee_qr('00000000-0000-4000-8000-000000000001', 'alipay', 'https://qr.alipay.com/x')$$,
  'P0002', null, 'another user cannot replace a method'
);

reset role;
select is((select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000a1'), 4::bigint, 'another user deleted nothing');
select is((select display_name from public.payee_methods where id = '00000000-0000-4000-8000-000000000001'), 'ALICE TAN', 'another user changed nothing');

set local role anon;
select throws_ok($$select * from public.payee_methods$$, '42501', null, 'anon cannot read payee methods');

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'payee methods cascade with the auth user');

select * from finish();
rollback;

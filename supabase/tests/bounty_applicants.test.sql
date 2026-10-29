begin;
select plan(13);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p@example.com', '{"full_name":"Poster"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Ava"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bao"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'w@example.com', '{"full_name":"Wen"}'),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'x@example.com', '{"full_name":"Xin"}');

insert into public.payee_methods (user_id, type)
values
  ('00000000-0000-0000-0000-0000000000b2', 'cash'),
  ('00000000-0000-0000-0000-0000000000e5', 'cash'),
  ('00000000-0000-0000-0000-0000000000c3', 'cash'),
  ('00000000-0000-0000-0000-0000000000d4', 'cash'),
  ('00000000-0000-0000-0000-0000000000f6', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create function pg_temp.pay(
  n integer, payer text, payee text, st public.payment_state, reversing uuid default null
) returns uuid language plpgsql as $$
declare
  pid uuid := ('00000000-0000-0000-0000-00000000' || lpad(n::text, 4, '0'))::uuid;
begin
  insert into public.payments (
    id, item_kind, item_id, title, payer_id, payee_id, amount_minor, currency, reference, state,
    method_type, marked_paid_at, settled_at, reverses
  )
  values (
    pid, 'bounty', gen_random_uuid(), '帮忙', pg_temp.u(payer), pg_temp.u(payee), 500, 'MYR',
    'TP-AAAA', st,
    case when st = 'due' then null else 'cash'::public.payee_method_type end,
    case when st in ('marked_paid', 'settled') then now() end,
    case when st = 'settled' then now() end,
    reversing
  );
  return pid;
end;
$$;

select pg_temp.pay(1, 'a7', 'b2', 'settled');
select pg_temp.pay(2, 'f6', 'b2', 'settled');
select pg_temp.pay(3, 'b2', 'a7', 'settled');
select pg_temp.pay(4, 'a7', 'b2', 'marked_paid');
select pg_temp.pay(6, 'a7', 'b2', 'settled', pg_temp.pay(7, 'b2', 'a7', 'settled'));
select pg_temp.pay(9, 'b2', 'c3', 'settled', pg_temp.pay(5, 'c3', 'b2', 'settled'));
select pg_temp.pay(8, 'a7', 'e5', 'due');

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('10000000-0000-0000-0000-000000000001', '帮取快递', 'pickup', 500, 'MYR', null, 'KL Sentral', 3.1340, 101.6860, 'Block C, 3-2');

select pg_temp.act_as(pg_temp.u('e5'));
select public.apply_to_bounty('10000000-0000-0000-0000-000000000001', 'B note');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('10000000-0000-0000-0000-000000000001', 'A note');
select pg_temp.act_as(pg_temp.u('c3'));
select public.apply_to_bounty('10000000-0000-0000-0000-000000000001', 'C note');
select pg_temp.act_as(pg_temp.u('d4'));
select public.apply_to_bounty('10000000-0000-0000-0000-000000000001', 'D note');
select public.block_user(pg_temp.u('a1'));
select pg_temp.act_as(pg_temp.u('f6'));
select public.apply_to_bounty('10000000-0000-0000-0000-000000000001', 'W note');
select public.withdraw_application('10000000-0000-0000-0000-000000000001');
select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('c3'));

update public.bounty_applications set created_at = now() - interval '2 minutes' where applicant_id = pg_temp.u('e5');
update public.bounty_applications set created_at = now() - interval '1 minute' where applicant_id = pg_temp.u('b2');

select is(
  (select jsonb_agg(x ->> 'applicantId') from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x),
  jsonb_build_array(pg_temp.u('e5'), pg_temp.u('b2')),
  'the poster lists only the unblocked pending applicants, in application order'
);
select is(
  (select array_agg(k order by k collate "C") from jsonb_object_keys(public.bounty_applicants('10000000-0000-0000-0000-000000000001') -> 0) k),
  array['applicantId', 'appliedAt', 'helpedCount', 'name', 'note', 'status', 'tier'],
  'each item has exactly the row keys'
);
select is(
  (select (x ->> 'helpedCount')::integer from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x
   where x ->> 'applicantId' = pg_temp.u('b2')::text),
  2, 'helpedCount counts settled forward payments received, not payer-side, reversed, reversal or unsettled ones'
);
select is(
  (select (x ->> 'helpedCount')::integer from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x
   where x ->> 'applicantId' = pg_temp.u('e5')::text),
  0, 'an applicant with no settled help has helpedCount 0'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x
   where x ->> 'applicantId' in (pg_temp.u('c3')::text, pg_temp.u('d4')::text, pg_temp.u('f6')::text)),
  0, 'blocked, blocking and withdrawn applicants are absent'
);

select public.select_helper('10000000-0000-0000-0000-000000000001', pg_temp.u('b2'));
select is(
  (select jsonb_agg(jsonb_build_object('id', x ->> 'applicantId', 'status', x ->> 'status', 'helped', x ->> 'helpedCount'))
   from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x),
  jsonb_build_array(jsonb_build_object('id', pg_temp.u('b2'), 'status', 'selected', 'helped', '2')),
  'after selection only the selected helper is listed, still with helpedCount'
);

select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  $$select public.bounty_applicants('10000000-0000-0000-0000-000000000001')$$,
  '42501', 'not_poster', 'an applicant cannot list the applicants'
);
select throws_ok(
  $$select public.bounty_applicants('10000000-0000-0000-0000-0000000000ff')$$,
  'P0002', 'bounty_not_found', 'an unknown bounty raises not found'
);
select ok(has_function_privilege('authenticated', 'public.bounty_applicants(uuid)', 'execute'), 'authenticated may execute');
select ok(not has_function_privilege('anon', 'public.bounty_applicants(uuid)', 'execute'), 'anon may not execute');
select is(
  (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'public.bounty_applicants(uuid)'::regprocedure),
  true, 'it stays security definer with an empty search_path'
);

select pg_temp.act_as(pg_temp.u('a1'));
select pg_temp.pay(11, 'b2', 'a7', 'marked_paid', pg_temp.pay(10, 'a7', 'b2', 'settled'));
select is(
  (select (x ->> 'helpedCount')::integer from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x),
  3, 'a help whose reversal is still open counts as helped'
);
update public.payments set state = 'settled', settled_at = now()
where id = '00000000-0000-0000-0000-000000000011';
select is(
  (select (x ->> 'helpedCount')::integer from jsonb_array_elements(public.bounty_applicants('10000000-0000-0000-0000-000000000001')) x),
  2, 'only a settled reversal removes the help'
);

select * from finish();
rollback;

begin;
select plan(78);

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
insert into public.payee_methods (id, user_id, type)
values ('00000000-0000-4000-8000-0000000000b9', '00000000-0000-0000-0000-0000000000b2', 'cash');
insert into public.payee_methods (id, user_id, type, phone, display_name)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-0000000000c3', 'duitnow_id', '+60198765432', 'CHEN');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('one', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 1500, 'MYR')),
  ('two', public.open_payment('bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 800, 'MYR')),
  ('chen', public.open_payment('ride', gen_random_uuid(), 'KLIA', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3', 2500, 'MYR'));

select matches((select reference from public.payments where id = (select id from ids where name = 'one')), '^TP-[A-HJ-NP-Z2-9]{4}$', 'reference is TP- plus four characters without 0/O/1/I');
select is((select state::text from public.payments where id = (select id from ids where name = 'one')), 'due', 'a new payment is due');
select is((select kind::text from public.payment_events where payment_id = (select id from ids where name = 'one')), 'opened', 'opening logs an event');
select throws_ok(
  format($$insert into public.payments (item_kind, item_id, title, payer_id, payee_id, amount_minor, currency, reference)
    values ('bounty', gen_random_uuid(), 'x', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 100, 'MYR', %L)$$,
    (select reference from public.payments where id = (select id from ids where name = 'one'))),
  '23505', null, 'a reference is unique among the payee''s unsettled payments'
);
select throws_ok(
  $$select public.open_payment('bounty', gen_random_uuid(), 'x', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 100, 'MYR')$$,
  '23514', null, 'payer and payee are two people'
);
select throws_ok(
  $$select public.open_payment('bounty', gen_random_uuid(), 'x', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 0, 'MYR')$$,
  '23514', null, 'the amount is positive'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

select is((select count(*) from public.payments), 3::bigint, 'the payer reads their payments');
select is((select count(*) from public.payment_events), 3::bigint, 'the payer reads their payment events');
select throws_ok(
  $$select public.open_payment('bounty', gen_random_uuid(), 'x', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 100, 'MYR')$$,
  '42501', null, 'a client cannot open a payment'
);
select throws_ok(
  $$insert into public.payments (item_kind, item_id, title, payer_id, payee_id, amount_minor, currency, reference)
    values ('bounty', gen_random_uuid(), 'x', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 100, 'MYR', 'TP-AAAA')$$,
  '42501', null, 'a client cannot insert a payment'
);
select throws_ok(
  $$update public.payments set state = 'settled'$$,
  '42501', null, 'a client cannot change a payment directly'
);
select throws_ok(
  $$select public.set_payment_amount((select id from ids where name = 'one'), 100)$$,
  '42501', null, 'a client cannot change the amount'
);
select is(
  (select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000b2'), 2::bigint,
  'the payer reads the payee''s methods while a payment is unsettled'
);
select is(
  (select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000c3'), 1::bigint,
  'the payer reads each payee they owe'
);
select is(public.publish_blocked(), true, 'two open unpaid payments block publishing');

select throws_ok(
  $$select public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b9')$$,
  '22023', null, 'cash is not marked paid by the payer'
);
select throws_ok(
  $$select public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000c1')$$,
  '22023', null, 'the method must belong to the payee'
);
select throws_ok(
  $$select public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1', 'someone-else/x.jpg')$$,
  '22023', null, 'a proof must sit in the payment''s folder'
);
select is(
  public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')::text,
  'marked_paid', 'the payer marks it paid'
);
select is((select method_type::text from public.payments where id = (select id from ids where name = 'one')), 'duitnow_id', 'the chosen method is recorded');
select throws_ok(
  $$select public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')$$,
  '55000', null, 'marking paid twice is rejected'
);
select throws_ok(
  $$select public.confirm_payment_received((select id from ids where name = 'one'))$$,
  '42501', null, 'the payer cannot confirm'
);
select throws_ok(
  $$select public.report_not_received((select id from ids where name = 'one'))$$,
  '42501', null, 'the payer cannot report not received'
);
select is(public.undo_marked_paid((select id from ids where name = 'one'))::text, 'due', 'the payer undoes 我已付款');
select is(
  (select row(state::text, method_type, marked_paid_at) from public.payments where id = (select id from ids where name = 'one')),
  row('due'::text, null::public.payee_method_type, null::timestamptz), 'undo clears the method and the time'
);
select throws_ok(
  $$select public.undo_marked_paid((select id from ids where name = 'one'))$$,
  '55000', null, 'undo needs a marked-paid payment'
);
select is(
  public.mark_payment_paid((select id from ids where name = 'one'), '00000000-0000-4000-8000-0000000000b1')::text,
  'marked_paid', 'the payer marks it paid again'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is((select count(*) from public.payments), 1::bigint, 'a third person reads only their own payment');
select is((select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000b2'), 0::bigint, 'a third person cannot read the payee''s methods');
select throws_ok(
  $$select public.confirm_payment_received((select id from ids where name = 'one'))$$,
  'P0002', null, 'a third person cannot confirm'
);
select throws_ok(
  $$select public.undo_marked_paid((select id from ids where name = 'one'))$$,
  'P0002', null, 'a third person cannot undo'
);
select is(public.publish_blocked(), false, 'someone owing nothing may publish');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.mark_payment_paid((select id from ids where name = 'two'), '00000000-0000-4000-8000-0000000000b1')$$,
  '42501', null, 'the payee cannot mark paid'
);
select throws_ok(
  $$select public.undo_marked_paid((select id from ids where name = 'one'))$$,
  '42501', null, 'the payee cannot undo'
);
select is(public.report_not_received((select id from ids where name = 'one'))::text, 'marked_paid', '还没收到 keeps it marked paid');
select isnt((select nudged_at from public.payments where id = (select id from ids where name = 'one')), null, '还没收到 stamps nudged_at for the payer');
select is((select kind::text from public.payment_events where payment_id = (select id from ids where name = 'one') order by id desc limit 1), 'nudged', '还没收到 logs an event');
select is(
  public.confirm_payment_received((select id from ids where name = 'one')),
  '{"state": "settled", "firstSettled": true, "stickerCount": 1}'::jsonb, '已收到 settles the first payment with the first flag'
);
select is((select kind::text from public.payment_events where payment_id = (select id from ids where name = 'one') order by id desc limit 1), 'settled', 'settling emits a settled event');
select throws_ok(
  $$select public.confirm_payment_received((select id from ids where name = 'one'))$$,
  '55000', null, 'a settled payment cannot be confirmed again'
);
select is(
  public.confirm_payment_received((select id from ids where name = 'two')),
  '{"state": "settled", "firstSettled": false, "stickerCount": 2}'::jsonb, 'cash: 已收到 alone settles a due payment; later settles are not first'
);
select is((select method_type::text from public.payments where id = (select id from ids where name = 'two')), 'cash', 'a payment settled from due records cash');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000b2'), 0::bigint,
  'the payee''s methods are hidden from the payer after settlement'
);
select is(public.publish_blocked(), false, 'one fresh unpaid payment does not block publishing');
select throws_ok(
  $$select public.undo_marked_paid((select id from ids where name = 'one'))$$,
  '55000', null, 'undo after settlement is rejected'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$select public.confirm_payment_received((select id from ids where name = 'chen'))$$,
  '55000', null, 'without cash the payee cannot settle before 我已付款'
);

reset role;
update public.payments set created_at = now() - interval '8 days' where id = (select id from ids where name = 'chen');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(public.publish_blocked(), true, 'a payment unpaid for 7 days blocks publishing');

reset role;
select lives_ok($$select public.set_payment_amount((select id from ids where name = 'chen'), 3000)$$, 'the amount changes while due');
update public.payments set state = 'marked_paid', marked_paid_at = now(), method_type = 'duitnow_id' where id = (select id from ids where name = 'chen');
select throws_ok(
  $$select public.set_payment_amount((select id from ids where name = 'chen'), 100)$$,
  '22023', null, 'the amount is fixed once marked paid'
);
select throws_ok(
  $$select public.open_reverse_payment((select id from ids where name = 'chen'))$$,
  '22023', null, 'only a settled payment is reversed'
);
insert into ids values ('reverse', public.open_reverse_payment((select id from ids where name = 'one')));
select is(
  (select row(payer_id, payee_id, amount_minor, currency, reverses) from public.payments where id = (select id from ids where name = 'reverse')),
  row('00000000-0000-0000-0000-0000000000b2'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid, 1500::bigint, 'MYR'::char(3), (select id from ids where name = 'one')),
  'a reverse payment has the helper pay the poster back the same amount'
);
select is(
  (select item_id from public.payments where id = (select id from ids where name = 'reverse')),
  (select item_id from public.payments where id = (select id from ids where name = 'one')),
  'a reverse payment opens for an item that already has its forward payment'
);
select throws_ok(
  $$select public.open_reverse_payment((select id from ids where name = 'one'))$$,
  '23505', null, 'a payment is reversed once'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint,
  'the helper sees no methods of a poster who has none'
);
reset role;
insert into ids values ('proofed', public.open_payment('bounty', gen_random_uuid(), '排队', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 600, 'MYR'));

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', '%s/sneaky.jpg')$$, (select id from ids where name = 'proofed')),
  '42501', null, 'a non-party cannot upload into another payment''s folder'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', '%s/draft.jpg')$$, (select id from ids where name = 'proofed')),
  'the payer uploads a draft proof'
);
select results_eq(
  $$with removed as (delete from storage.objects where bucket_id = 'payment-proofs' and name = (select id from ids where name = 'proofed') || '/draft.jpg' returning 1)
    select count(*)::int from removed$$,
  $$values (1)$$,
  'the payer deletes an unattached draft while the payment is due'
);
select throws_ok(
  format($$select public.mark_payment_paid(%L, '00000000-0000-4000-8000-0000000000b1', %L)$$,
    (select id from ids where name = 'proofed'), (select id from ids where name = 'proofed') || '/missing.jpg'),
  '22023', null, 'a proof must exist in storage'
);
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', '%s/proof.jpg')$$, (select id from ids where name = 'proofed')),
  'the payer uploads a proof into the payment''s folder'
);
select is(
  public.mark_payment_paid((select id from ids where name = 'proofed'), '00000000-0000-4000-8000-0000000000b1', (select id from ids where name = 'proofed') || '/proof.jpg')::text,
  'marked_paid', 'the payer marks paid with the proof'
);
select is(
  (select count(*) from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000b2'), 2::bigint,
  'the payer still reads the payee''s methods while marked paid, with no other payment due'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', '%s/late.jpg')$$, (select id from ids where name = 'proofed')),
  '42501', null, 'no upload after 我已付款'
);
select results_eq(
  $$with removed as (delete from storage.objects where bucket_id = 'payment-proofs' and name = (select id from ids where name = 'proofed') || '/proof.jpg' returning 1)
    select count(*)::int from removed$$,
  $$values (0)$$,
  'the attached proof cannot be deleted by the payer'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs'), 1::bigint, 'the payee reads the proof');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', '%s/other.jpg')$$, (select id from ids where name = 'proofed')),
  '42501', null, 'the payee cannot upload a proof'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs'), 0::bigint, 'a third person cannot read the proof');

reset role;
insert into storage.objects (bucket_id, name, created_at)
values ('payment-proofs', (select id from ids where name = 'proofed') || '/abandoned.jpg', now() - interval '4 hours'),
       ('payment-proofs', (select id from ids where name = 'proofed') || '/fresh.jpg', now());
update storage.objects set created_at = now() - interval '4 hours' where name = (select id from ids where name = 'proofed') || '/proof.jpg';
select results_eq(
  $$select split_part(object_name, '/', 2), clears_proof from public.payment_proofs_to_delete() order by 1$$,
  $$values ('abandoned.jpg', false)$$,
  'an unattached object older than the grace period is deleted; the current proof and fresh drafts stay'
);
update public.payments set state = 'settled', settled_at = now() - interval '31 days' where id = (select id from ids where name = 'proofed');
select results_eq(
  $$select split_part(object_name, '/', 2), clears_proof from public.payment_proofs_to_delete() order by 1$$,
  $$values ('abandoned.jpg', false), ('fresh.jpg', false), ('proof.jpg', true)$$,
  'everything of a payment settled 30 days ago is deleted'
);
select public.clear_payment_proof((select id from ids where name = 'proofed'));
select is((select proof_path from public.payments where id = (select id from ids where name = 'proofed')), null, 'clearing removes the proof path');

insert into ids values ('coffee', public.open_payment(
  'bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900,
  'MYR', item_category => 'buy'
));
select is(
  (select category::text from public.payments where id = (select id from ids where name = 'coffee')), 'buy',
  'a bounty payment stores its category'
);
select throws_ok(
  format($$select public.open_payment('bounty', %L, '帮带咖啡', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900, 'MYR')$$,
    (select item_id from public.payments where id = (select id from ids where name = 'coffee'))),
  '23505', 'payment_exists', 'an item holds one forward payment'
);
select lives_ok(
  format($$select public.open_payment('ride', %L, '拼车回 YC', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900, 'MYR')$$,
    (select item_id from public.payments where id = (select id from ids where name = 'coffee'))),
  'the same item id under the other kind opens'
);
select lives_ok(
  format($$select public.open_payment('ride', %L, '拼车回 YC', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3', 900, 'MYR')$$,
    (select item_id from public.payments where id = (select id from ids where name = 'coffee'))),
  'a ride opens one payment per rider'
);
select throws_ok(
  $$select public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900, 'MYR', item_category => 'parcel')$$,
  '23514', null, 'a category outside the eight slugs is rejected'
);
select throws_ok(
  $$select public.open_payment('ride', gen_random_uuid(), '拼车回 YC', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 900, 'MYR', item_category => 'pickup')$$,
  '23514', null, 'a ride payment carries no category'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.open_payment(public.payment_item_kind, uuid, text, uuid, uuid, bigint, text, uuid, public.bounty_category)',
    'execute'
  ),
  false, 'a client cannot execute open_payment'
);

set local role anon;
select throws_ok($$select * from public.payments$$, '42501', null, 'anon cannot read payments');

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c3';
select is(
  (select count(*) from public.payments where id = (select id from ids where name = 'proofed') and payer_id is null), 1::bigint,
  'a deleted user''s settled payments stay without the user'
);

select * from finish();
rollback;

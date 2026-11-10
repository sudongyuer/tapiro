begin;
select plan(54);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farid"}');

create function pg_temp.credit(uid uuid, txn text, product text, env public.iap_environment default 'Sandbox')
returns jsonb language sql as $$
  select public.iap_credit(uid, txn, txn, product, env, '2026-11-11 10:00+08');
$$;

create function pg_temp.revoke(uid uuid, txn text, product text) returns jsonb language sql as $$
  select public.iap_revoke(uid, txn, txn, product, 'Sandbox', '2026-11-11 10:00+08', '2026-11-12 10:00+08');
$$;

create function pg_temp.notify(n uuid, kind text, txn text, product text default 'app.tapiro.coins.5')
returns jsonb language sql as $$
  select public.iap_apply_notification(
    n, kind, null, 'Sandbox', '2026-11-13 10:00+08', txn, txn, product, '2026-11-11 10:00+08',
    case when kind = 'REFUND' then '2026-11-13 09:00+08'::timestamptz end
  );
$$;

create function pg_temp.coins(uid uuid) returns integer language sql as $$
  select private.coins_of(uid);
$$;

create function pg_temp.rows_for(txn text) returns text[] language sql as $$
  select coalesce(array_agg(reason::text || ' ' || delta order by id), '{}') from public.coin_ledger
  where iap_transaction_id = txn;
$$;

select is(pg_temp.coins('00000000-0000-0000-0000-0000000000a1'), 5, 'a new user starts with the 5-coin grant');

select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000a1', 't-a1', 'app.tapiro.coins.5') - 'transactionId',
  jsonb_build_object(
    'status', 'credited', 'productId', 'app.tapiro.coins.5', 'coins', 5, 'environment', 'Sandbox', 'balance', 10
  ),
  'a verified purchase credits the pack and answers the new balance'
);
select is(pg_temp.rows_for('t-a1'), array['purchase 5'], 'the credit is one purchase row linked to the transaction');
select is(
  (select environment::text from public.iap_transactions where transaction_id = 't-a1'), 'Sandbox',
  'a sandbox purchase is marked Sandbox'
);
select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000a1', 't-a1', 'app.tapiro.coins.5') ->> 'status', 'duplicate',
  'the same transaction a second time answers duplicate'
);
select is(pg_temp.rows_for('t-a1'), array['purchase 5'], 'a duplicate writes no second row');
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000a1'), 10, 'a duplicate leaves the balance as it was');

select throws_ok(
  $$select pg_temp.credit('00000000-0000-0000-0000-0000000000b2', 't-a1', 'app.tapiro.coins.5')$$,
  '42501', 'transaction_owned_elsewhere', 'another user cannot claim a credited transaction'
);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000b2'), 5, 'the other user gains nothing');

select throws_ok(
  $$select pg_temp.credit('00000000-0000-0000-0000-0000000000b2', 't-x', 'app.tapiro.coins.999')$$,
  '22023', 'unknown_product', 'an unknown product is refused'
);
select is(
  (select count(*) from public.iap_transactions where transaction_id = 't-x'), 0::bigint,
  'a refused product writes no transaction'
);
select throws_ok(
  $$select public.iap_credit('00000000-0000-0000-0000-0000000000b2', '', '', 'app.tapiro.coins.5', 'Sandbox', now())$$,
  '22023', 'invalid_transaction', 'an empty transaction id is refused'
);

select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000b2', 't-b2', 'app.tapiro.coins.35', 'Xcode') ->> 'coins', '35',
  'the coin amount comes from the product table'
);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000b2'), 40, 'the 35 pack adds 35 coins');
select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000b2', 't-b2b', 'app.tapiro.coins.11', 'Production') ->> 'coins',
  '11', 'the 11 pack adds 11 coins'
);

select is(
  pg_temp.revoke('00000000-0000-0000-0000-0000000000a1', 't-a1', 'app.tapiro.coins.5') ->> 'status', 'revoked',
  'a refund before spending is applied'
);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000a1'), 5, 'a refund before spending takes the pack back');
select is(
  pg_temp.rows_for('t-a1'), array['purchase 5', 'purchase_refund -5'], 'the refund is one ledger row'
);
select is(
  pg_temp.revoke('00000000-0000-0000-0000-0000000000a1', 't-a1', 'app.tapiro.coins.5') ->> 'status', 'duplicate',
  'a second refund of the same transaction answers duplicate'
);
select is(
  pg_temp.rows_for('t-a1'), array['purchase 5', 'purchase_refund -5'], 'a repeated refund writes nothing'
);
select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000a1', 't-a1', 'app.tapiro.coins.5') ->> 'status', 'duplicate',
  'a refunded transaction sent again is not credited again'
);
select throws_ok(
  $$select pg_temp.revoke('00000000-0000-0000-0000-0000000000b2', 't-a1', 'app.tapiro.coins.5')$$,
  '42501', 'transaction_owned_elsewhere', 'a user cannot refund another user''s transaction'
);

select is(pg_temp.credit('00000000-0000-0000-0000-0000000000c3', 't-c3', 'app.tapiro.coins.35') ->> 'balance', '40',
  'the buyer has 40 coins after the 35 pack');
insert into public.coin_ledger (user_id, reason, delta, item_kind, item_id)
select '00000000-0000-0000-0000-0000000000c3', 'post_spend', -1, 'bounty', gen_random_uuid()
from generate_series(1, 38);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000c3'), 2, 'the buyer spent 38 of the 40 coins');
select is(
  pg_temp.revoke(null, 't-c3', 'app.tapiro.coins.35') ->> 'balance', '-33',
  'a refund after spending takes the full pack back and the balance goes below zero'
);
select is(
  public.spend_post('00000000-0000-0000-0000-0000000000c3', 'bounty', gen_random_uuid()), 'free',
  'a negative balance still gets the free monthly posts'
);
select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'bounty', gen_random_uuid());
select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'ride', gen_random_uuid());
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'bounty', gen_random_uuid())$$,
  '55000', 'no_balance', 'with the free posts used, a negative balance cannot post'
);
select is(
  pg_temp.coins('00000000-0000-0000-0000-0000000000c3'), -32,
  'the free posts and their onboarding grant leave the debt otherwise unchanged'
);
select is(
  (select (public.coin_balance() ->> 'coins')::integer
   from (select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true)) s),
  -32, 'coin_balance reports the negative balance'
);

select is(
  pg_temp.revoke(null, 't-d4', 'app.tapiro.coins.11') ->> 'status', 'revoked',
  'a refund for a transaction never verified is recorded'
);
select is(
  (select row(user_id, credited_at, revoked_at is not null) from public.iap_transactions where transaction_id = 't-d4'),
  row(null::uuid, null::timestamptz, true), 'it is kept as an uncredited, revoked transaction'
);
select is(
  pg_temp.credit('00000000-0000-0000-0000-0000000000d4', 't-d4', 'app.tapiro.coins.11') ->> 'status', 'revoked',
  'the app sending the refunded transaction later gets revoked'
);
select is(pg_temp.rows_for('t-d4'), '{}'::text[], 'a transaction refunded before it was credited never moves coins');
select is(
  (select user_id from public.iap_transactions where transaction_id = 't-d4'),
  '00000000-0000-0000-0000-0000000000d4'::uuid, 'the buyer is recorded on the refunded transaction'
);

select pg_temp.credit('00000000-0000-0000-0000-0000000000e5', 't-e5', 'app.tapiro.coins.5');
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000001', 'REFUND', 't-e5') ->> 'status', 'revoked',
  'a REFUND notification revokes the purchase'
);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000e5'), 5, 'the REFUND notification takes the coins back');
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000001', 'REFUND', 't-e5') ->> 'status', 'duplicate',
  'the same notification delivered again answers duplicate'
);
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000002', 'REFUND_REVERSED', 't-e5') ->> 'status', 'reinstated',
  'a REFUND_REVERSED notification reinstates the purchase'
);
select is(
  pg_temp.rows_for('t-e5'), array['purchase 5', 'purchase_refund -5', 'purchase_refund_reversed 5'],
  'the reversal gives the coins back in one row'
);
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000003', 'REFUND', 't-e5') ->> 'status', 'duplicate',
  'a refund after a reversal changes nothing'
);
select is(pg_temp.coins('00000000-0000-0000-0000-0000000000e5'), 10, 'the reinstated coins stay');

select pg_temp.credit('00000000-0000-0000-0000-0000000000f6', 't-f6', 'app.tapiro.coins.5');
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000004', 'REFUND_REVERSED', 't-f6') ->> 'status', 'reinstated',
  'a reversal that arrives before its refund is recorded'
);
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000005', 'REFUND', 't-f6') ->> 'status', 'duplicate',
  'the late refund is ignored'
);
select is(pg_temp.rows_for('t-f6'), array['purchase 5'], 'out-of-order refund notices move no coins');
select is(
  pg_temp.notify('10000000-0000-4000-8000-000000000006', 'TEST', null) ->> 'status', 'ignored',
  'other notification types are recorded and ignored'
);
select is(
  (select array_agg(outcome order by signed_at, notification_uuid) from public.iap_notifications),
  array['revoked', 'reinstated', 'duplicate', 'reinstated', 'duplicate', 'ignored'],
  'every notification is stored once with its outcome'
);

select throws_ok(
  $$insert into public.coin_ledger (user_id, reason, delta) values ('00000000-0000-0000-0000-0000000000f6', 'purchase', 5)$$,
  '23514', null, 'a purchase row must name its transaction'
);
select throws_ok(
  $$delete from public.iap_transactions where transaction_id = 't-f6'$$,
  '55000', 'ledger_is_append_only', 'a transaction cannot be deleted'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f6","role":"authenticated"}', true);
select throws_ok($$select * from public.iap_transactions$$, '42501', null, 'clients cannot read transactions');
select throws_ok($$select * from public.iap_products$$, '42501', null, 'clients cannot read the product table');
select throws_ok(
  $$select pg_temp.credit('00000000-0000-0000-0000-0000000000f6', 't-self', 'app.tapiro.coins.35')$$,
  '42501', null, 'clients cannot credit themselves'
);
select is(
  (select jsonb_agg(i ->> 'reason') from jsonb_array_elements(public.coin_history() -> 'items') i),
  '["purchase", "new_user"]'::jsonb, 'the buyer''s history lists the purchase'
);
reset role;

delete from auth.users where id = '00000000-0000-0000-0000-0000000000e5';
select is(
  (select row(user_id, environment::text) from public.iap_transactions where transaction_id = 't-e5'),
  row(null::uuid, 'Sandbox'::text), 'account deletion keeps the transaction without its owner'
);
select is(
  (select count(*) from public.coin_ledger where iap_transaction_id = 't-e5' and user_id is null), 3::bigint,
  'account deletion keeps the purchase rows anonymised'
);

select * from finish();
rollback;

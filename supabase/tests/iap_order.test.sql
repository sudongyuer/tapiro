begin;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000010' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'order' || n || '@example.com', '{"full_name":"Order Buyer"}'
from generate_series(1, 6) n;

create function pg_temp.buyer(n integer) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-00000000010' || n)::uuid;
$$;

create function pg_temp.step(n integer, step text) returns text language sql as $$
  select case step
    when 'credit' then public.iap_credit(
      pg_temp.buyer(n), 'order-' || n, 'order-' || n, 'app.tapiro.coins.5', 'Sandbox', '2026-11-11 10:00+08'
    ) ->> 'status'
    else public.iap_apply_notification(
      gen_random_uuid(), step, null, 'Sandbox', '2026-11-13 10:00+08', 'order-' || n, 'order-' || n,
      'app.tapiro.coins.5', '2026-11-11 10:00+08',
      case when step = 'REFUND' then '2026-11-12 10:00+08'::timestamptz end
    ) ->> 'status'
  end;
$$;

create function pg_temp.run(n integer, steps text[]) returns text[] language sql as $$
  select array_agg(pg_temp.step(n, s) order by i) from unnest(steps) with ordinality as t(s, i);
$$;

create function pg_temp.rows_for(n integer) returns text[] language sql as $$
  select coalesce(array_agg(reason::text || ' ' || delta order by id), '{}') from public.coin_ledger
  where iap_transaction_id = 'order-' || n;
$$;

select is(
  pg_temp.run(1, array['credit', 'REFUND', 'REFUND_REVERSED']), array['credited', 'revoked', 'reinstated'],
  'credit, refund, reversal'
);
select is(
  pg_temp.rows_for(1), array['purchase 5', 'purchase_refund -5', 'purchase_refund_reversed 5'],
  'credit, refund, reversal: the buyer keeps the pack'
);
select is(private.coins_of(pg_temp.buyer(1)), 10, 'credit, refund, reversal: balance');

select is(
  pg_temp.run(2, array['credit', 'REFUND_REVERSED', 'REFUND']), array['credited', 'reinstated', 'duplicate'],
  'credit, reversal, refund'
);
select is(pg_temp.rows_for(2), array['purchase 5'], 'credit, reversal, refund: the late refund moves nothing');
select is(private.coins_of(pg_temp.buyer(2)), 10, 'credit, reversal, refund: balance');

select is(
  pg_temp.run(3, array['REFUND', 'credit', 'REFUND_REVERSED']), array['revoked', 'revoked', 'reinstated'],
  'refund, credit, reversal'
);
select is(
  pg_temp.rows_for(3), array['purchase 5'],
  'refund, credit, reversal: the reversal pays the pack the refund withheld'
);
select is(private.coins_of(pg_temp.buyer(3)), 10, 'refund, credit, reversal: balance');

select is(
  pg_temp.run(4, array['REFUND', 'REFUND_REVERSED', 'credit']), array['revoked', 'reinstated', 'credited'],
  'refund, reversal, credit'
);
select is(pg_temp.rows_for(4), array['purchase 5'], 'refund, reversal, credit: the credit pays once');
select is(private.coins_of(pg_temp.buyer(4)), 10, 'refund, reversal, credit: balance');

select is(
  pg_temp.run(5, array['REFUND_REVERSED', 'credit', 'REFUND']), array['reinstated', 'credited', 'duplicate'],
  'reversal, credit, refund'
);
select is(pg_temp.rows_for(5), array['purchase 5'], 'reversal, credit, refund: the late refund moves nothing');
select is(private.coins_of(pg_temp.buyer(5)), 10, 'reversal, credit, refund: balance');

select is(
  pg_temp.run(6, array['REFUND_REVERSED', 'REFUND', 'credit']), array['reinstated', 'duplicate', 'credited'],
  'reversal, refund, credit'
);
select is(
  pg_temp.rows_for(6), array['purchase 5'],
  'reversal, refund, credit: a reversal seen first is kept, so the purchase is still credited'
);
select is(private.coins_of(pg_temp.buyer(6)), 10, 'reversal, refund, credit: balance');

select * from finish();
rollback;

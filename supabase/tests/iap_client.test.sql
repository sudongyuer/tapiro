begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pa@example.com', '{"full_name":"Pack Alice"}');

select public.iap_credit(
  '00000000-0000-0000-0000-0000000001a1', 'p-sandbox', 'p-sandbox', 'app.tapiro.coins.11', 'Sandbox', '2026-11-12 10:00+08'
);
select public.iap_credit(
  '00000000-0000-0000-0000-0000000001a1', 'p-xcode', 'p-xcode', 'app.tapiro.coins.5', 'Xcode', '2026-11-12 10:00+08'
);
select public.iap_revoke(
  '00000000-0000-0000-0000-0000000001a1', 'p-xcode', 'p-xcode', 'app.tapiro.coins.5', 'Xcode',
  '2026-11-12 10:00+08', '2026-11-12 11:00+08'
);
update public.iap_transactions set environment = 'Production' where transaction_id = 'p-sandbox';

set local role anon;
select throws_ok($$select public.iap_packs()$$, '42501', null, 'anonymous callers cannot list packs');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}', true);

select is(
  public.iap_packs(),
  '[{"productId":"app.tapiro.coins.5","coins":5},{"productId":"app.tapiro.coins.11","coins":11},{"productId":"app.tapiro.coins.35","coins":35}]'::jsonb,
  'a signed-in user reads the three packs from the server table, smallest first'
);

create temporary table history on commit drop as
select i from jsonb_array_elements(public.coin_history() -> 'items') i;

select is(
  (select jsonb_agg(i ->> 'reason' order by (i ->> 'id')::bigint desc) from history),
  '["purchase_refund", "purchase", "purchase", "new_user"]'::jsonb,
  'the history lists both purchases and the refund'
);
select is(
  (select i -> 'sandbox' from history where i ->> 'reason' = 'purchase' and (i ->> 'delta')::int = 11),
  'false'::jsonb, 'a Production purchase is not marked as a test purchase'
);
select is(
  (select jsonb_agg(i -> 'sandbox') from history where i ->> 'reason' like 'purchase%' and abs((i ->> 'delta')::int) = 5),
  '[true, true]'::jsonb, 'an Xcode purchase and its refund are marked as test purchases'
);
select is(
  (select i ? 'sandbox' from history where i ->> 'reason' = 'new_user'), false,
  'rows that are not purchases carry no sandbox mark'
);
select is(
  (select i -> 'item' from history where i ->> 'reason' = 'purchase' and (i ->> 'delta')::int = 11), 'null'::jsonb,
  'a purchase row links no bounty or ride'
);
reset role;

select * from finish();
rollback;

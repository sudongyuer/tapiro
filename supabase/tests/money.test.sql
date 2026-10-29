begin;
select plan(47);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

insert into public.coin_ledger (user_id, reason, delta)
select '00000000-0000-0000-0000-0000000000a1', 'help_settled', 1 from generate_series(1, 5);

insert into public.payee_methods (id, user_id, type, phone, display_name, qr_payload)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'duitnow_id', '+60123456789', 'BOB LIM', null),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'alipay', null, 'Bob', 'https://qr.alipay.com/bob'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-0000000000b2', 'cash', null, null, null);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Asia/Kuala_Lumpur')::date;
$$;

create temp table fx (name text primary key, id uuid not null);
grant all on fx to authenticated;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.methods(payment uuid) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_array(m ->> 'type', m ->> 'currency', m -> 'amountMinor') order by n)
  from jsonb_array_elements(public.payment_detail(payment) -> 'methods') with ordinality as x(m, n);
$$;

create function pg_temp.board(viewer text, n text, reference text) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(viewer));
  return (
    select i from jsonb_array_elements(public.nearby_bounties(reference_currency => reference) -> 'items') i
    where i ->> 'id' = pg_temp.fx(n)::text
  );
end;
$$;

delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 1, 'bnm', 0.61225);

select is(
  array[public.method_currency('duitnow_id', 'CNY'), public.method_currency('bank_account', 'CNY'),
    public.method_currency('duitnow_qr', 'CNY'), public.method_currency('alipay', 'MYR'),
    public.method_currency('wechat', 'MYR'), public.method_currency('cash', 'CNY')]::text[],
  array['MYR', 'MYR', 'MYR', 'CNY', 'CNY', 'CNY'],
  'DuitNow and bank move MYR, Alipay and WeChat move CNY, cash takes the item''s currency'
);

insert into fx values ('cny800', gen_random_uuid()), ('cny801', gen_random_uuid()), ('myr500', gen_random_uuid());
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.publish_bounty(pg_temp.fx('cny800'), '帮取快递', 'pickup', 80000, 'CNY') ->> 'status', 'open',
  '¥800 is accepted'
);
select throws_ok(
  $$select public.publish_bounty(pg_temp.fx('cny801'), '帮取快递', 'pickup', 80100, 'CNY')$$,
  '22023', 'invalid_reward', '¥801 is rejected'
);
select is(
  public.publish_bounty(pg_temp.fx('myr500'), '帮搬家', 'move', 50000, 'MYR') ->> 'status', 'open',
  'RM 500 is accepted'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), '帮搬家', 'move', 50100, 'MYR')$$,
  '22023', 'invalid_reward', 'RM 501 is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), '帮搬家', 'move', 150, 'CNY')$$,
  '22023', 'invalid_reward', '¥1.50 is rejected: yuan rewards are whole'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), '帮搬家', 'move', 500, 'USD')$$,
  '22023', 'invalid_reward', 'an unknown currency is rejected'
);
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), '帮搬家', 'move', 500, null)$$,
  '22023', 'invalid_reward', 'a missing currency is rejected'
);
reset role;
insert into public.currencies (code, minor_digits, symbol, enabled) values ('SGD', 2, 'S$', false);
insert into public.post_limits (item_kind, currency, min_minor, max_minor, step_minor) values ('bounty', 'SGD', 100, 50000, 100);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok(
  $$select public.publish_bounty(gen_random_uuid(), '帮搬家', 'move', 500, 'SGD')$$,
  '22023', 'invalid_reward', 'a disabled currency is rejected'
);
reset role;
select is(
  (select reward_minor || ' ' || reward_currency from public.bounties where id = pg_temp.fx('cny800')), '80000 CNY',
  'the reward is stored in its own currency'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_minor, reward_currency, expires_at)
    values (gen_random_uuid(), 't', 'pickup', 80100, 'CNY', now() + interval '1 day')$$,
  '23514', 'invalid_reward', 'the table holds rewards to the per-currency limits'
);
select throws_ok(
  $$update public.post_limits set min_minor = 150 where currency = 'MYR'$$,
  '23514', null, 'a limit range is a whole number of steps'
);

set local role authenticated;
select is(
  pg_temp.board('d4', 'cny800', 'MYR') - array['id', 'title', 'category', 'placeLabel', 'stickerPath', 'startsAt',
    'endsAt', 'deadlineAt', 'urgent', 'distanceM', 'appliedByMe', 'createdAt', 'poster'],
  jsonb_build_object('rewardMinor', 80000, 'rewardCurrency', 'CNY',
    'reference', jsonb_build_object('minor', 48980, 'currency', 'MYR', 'rateDate', pg_temp.today() - 1)),
  'the board shows ¥800 with today''s MYR reference'
);
select is(
  pg_temp.board('d4', 'myr500', 'CNY') -> 'reference' -> 'minor', '81666'::jsonb,
  'RM 500 converts to CNY by dividing by the rate and rounds up'
);
select is(pg_temp.board('d4', 'myr500', 'MYR') -> 'reference', 'null'::jsonb, 'no reference in the reward''s own currency');
select is(pg_temp.board('d4', 'myr500', null) -> 'reference', 'null'::jsonb, 'no reference without a viewer currency');
select is(pg_temp.board('d4', 'myr500', 'SGD') -> 'reference', 'null'::jsonb, 'no reference into a disabled currency');

select pg_temp.act_as(pg_temp.u('d4'));
select is(
  public.bounty_detail(pg_temp.fx('cny800'), reference_currency => 'MYR') -> 'reference' -> 'minor', '48980'::jsonb,
  'the detail shows the same reference'
);
select is(
  public.bounty_detail(pg_temp.fx('cny800')) -> 'reference', 'null'::jsonb,
  'the detail has no reference when no currency is asked for'
);
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select jsonb_agg(jsonb_build_array(b -> 'rewardMinor', b -> 'rewardCurrency') order by b ->> 'rewardCurrency')
   from jsonb_array_elements(public.my_bounties() -> 'posted') b),
  '[[80000, "CNY"], [50000, "MYR"]]'::jsonb,
  'the poster''s list carries each reward with its currency'
);
select is(
  (select jsonb_agg(jsonb_build_array(i -> 'rewardMinor', i -> 'rewardCurrency') order by i ->> 'rewardCurrency')
   from jsonb_array_elements(public.bounty_live_items()) i),
  '[[80000, "CNY"], [50000, "MYR"]]'::jsonb,
  'live items carry each reward with its currency'
);

reset role;
insert into fx values
  ('ten', public.open_payment('bounty', gen_random_uuid(), '帮取快递', pg_temp.u('c3'), pg_temp.u('b2'), 1000, 'CNY')),
  ('hundred', public.open_payment('bounty', gen_random_uuid(), '帮带饭', pg_temp.u('c3'), pg_temp.u('b2'), 10000, 'CNY')),
  ('two_hundred', public.open_payment('ride', gen_random_uuid(), '拼车', pg_temp.u('c3'), pg_temp.u('b2'), 20000, 'CNY')),
  ('ringgit', public.open_payment('ride', gen_random_uuid(), '拼车', pg_temp.u('c3'), pg_temp.u('b2'), 1000, 'MYR'));
select is(
  (select row(currency, rate_quote_per_base, rate_base, rate_quote, rate_date, rate_source)::text
   from public.payments where id = pg_temp.fx('ten')),
  row('CNY', 0.61225::numeric(18, 8), 'CNY', 'MYR', pg_temp.today() - 1, 'bnm')::text,
  'opening locks the newest rate with its pair, date and source'
);
select throws_ok(
  $$select public.open_payment('ride', gen_random_uuid(), '拼车', pg_temp.u('c3'), pg_temp.u('b2'), 1000, 'USD')$$,
  '23503', null, 'a payment cannot open in an unknown currency'
);

insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today(), 'bnm', 0.7);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  pg_temp.methods(pg_temp.fx('ten')),
  '[["duitnow_id", "MYR", 613], ["alipay", "CNY", 1000], ["cash", "CNY", 1000]]'::jsonb,
  '¥10.00 at 0.61225 is RM 6.1225, rounded up to RM 6.13; CNY methods pay the original'
);
select is(
  pg_temp.methods(pg_temp.fx('hundred')) -> 0 -> 2, '6123'::jsonb,
  '¥100 at 0.61225 is RM 61.225, rounded up to RM 61.23'
);
select is(
  pg_temp.methods(pg_temp.fx('two_hundred')) -> 0 -> 2, '12245'::jsonb,
  'an exact conversion is not rounded further'
);
select is(
  pg_temp.methods(pg_temp.fx('ringgit')),
  '[["duitnow_id", "MYR", 1000], ["alipay", "CNY", 1634], ["cash", "MYR", 1000]]'::jsonb,
  'RM 10 converts to ¥16.34 at the locked rate'
);
select is(
  public.payment_detail(pg_temp.fx('ten')) -> 'rate',
  jsonb_build_object('base', 'CNY', 'quote', 'MYR', 'quotePerBase', 0.61225, 'date', pg_temp.today() - 1, 'source', 'bnm'),
  'a rate that arrives after opening never changes the locked rate'
);
select pg_temp.act_as(pg_temp.u('d4'));
select throws_ok(
  $$select public.payment_detail(pg_temp.fx('ten'))$$, 'P0002', null, 'only the two parties read a payment'
);

select pg_temp.act_as(pg_temp.u('c3'));
select lives_ok(
  $$select public.mark_payment_paid(pg_temp.fx('ten'), '00000000-0000-4000-8000-000000000001')$$,
  'the payer marks it paid by DuitNow'
);
select is(
  (select paid_minor || ' ' || paid_currency from public.payments where id = pg_temp.fx('ten')), '613 MYR',
  'marking paid records the converted amount and its currency'
);
select public.undo_marked_paid(pg_temp.fx('ten'));
select is(
  (select row(paid_minor, paid_currency)::text from public.payments where id = pg_temp.fx('ten')), '(,)',
  'undo clears the paid amount'
);
select public.mark_payment_paid(pg_temp.fx('ten'), '00000000-0000-4000-8000-000000000002');
select is(
  (select paid_minor || ' ' || paid_currency from public.payments where id = pg_temp.fx('ten')), '1000 CNY',
  'paying by Alipay records the original yuan'
);
select public.undo_marked_paid(pg_temp.fx('ten'));
select public.mark_payment_paid(pg_temp.fx('ten'), '00000000-0000-4000-8000-000000000001');
select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received(pg_temp.fx('ten'));
reset role;
insert into fx values ('back', public.open_reverse_payment(pg_temp.fx('ten')));
select is(
  (select amount_minor || ' ' || currency from public.payments where id = pg_temp.fx('back')), '613 MYR',
  'a reverse payment pays back what was paid, in the paid currency'
);
select throws_ok(
  $$update public.payments set rate_quote_per_base = 0.7 where id = pg_temp.fx('hundred')$$,
  '22023', null, 'the locked rate never changes'
);
select throws_ok(
  $$update public.payments set currency = 'MYR' where id = pg_temp.fx('hundred')$$,
  '22023', null, 'the payment currency never changes'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received(pg_temp.fx('ringgit'));
reset role;
select is(
  (select paid_minor || ' ' || paid_currency from public.payments where id = pg_temp.fx('ringgit')), '1000 MYR',
  'a cash settle without marking paid records the original amount'
);

delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 8, 'bnm', 0.6122);
insert into fx values
  ('stale', public.open_payment('bounty', gen_random_uuid(), '帮取快递', pg_temp.u('c3'), pg_temp.u('b2'), 1000, 'CNY'));
select is(
  (select num_nulls(rate_quote_per_base, rate_base, rate_quote, rate_date, rate_source) from public.payments
   where id = pg_temp.fx('stale')),
  5, 'with no rate from the last 7 days the payment opens without one'
);
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today(), 'bnm', 0.6122);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  pg_temp.methods(pg_temp.fx('stale')),
  '[["duitnow_id", "MYR", null], ["alipay", "CNY", 1000], ["cash", "CNY", 1000]]'::jsonb,
  'without a locked rate only original-currency methods have amounts, even after a rate arrives'
);
select is(public.payment_detail(pg_temp.fx('stale')) -> 'rate', 'null'::jsonb, 'the payment shows no rate');
select throws_ok(
  $$select public.mark_payment_paid(pg_temp.fx('stale'), '00000000-0000-4000-8000-000000000001')$$,
  '55000', 'no_rate', 'a method that needs a conversion is rejected without a locked rate'
);
select lives_ok(
  $$select public.mark_payment_paid(pg_temp.fx('stale'), '00000000-0000-4000-8000-000000000002')$$,
  'a method in the original currency still pays'
);

reset role;
delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 7, 'bnm', 0.6122);
insert into fx values
  ('week', public.open_payment('bounty', gen_random_uuid(), '帮取快递', pg_temp.u('c3'), pg_temp.u('b2'), 1000, 'CNY'));
select is(
  (select rate_date from public.payments where id = pg_temp.fx('week')),
  pg_temp.today() - 7, 'a rate exactly 7 days old still locks'
);
delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 8, 'bnm', 0.6122);
set local role authenticated;
select is(pg_temp.board('d4', 'cny800', 'MYR') -> 'reference', 'null'::jsonb, 'no reference from a stale rate');

reset role;
insert into fx values ('done', gen_random_uuid());
insert into public.bounties (
  id, poster_id, helper_id, title, category, reward_minor, reward_currency, expires_at, status, done_at
)
values (pg_temp.fx('done'), pg_temp.u('a1'), pg_temp.u('b2'), '帮取快递', 'pickup', 5000, 'CNY',
  now() + interval '7 days', 'done', now());
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today(), 'bnm', 0.6122);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
insert into fx values ('paid', (public.confirm_bounty(pg_temp.fx('done')) ->> 'paymentId')::uuid);
select is(
  (select amount_minor || ' ' || currency || ' ' || rate_quote_per_base from public.payments where id = pg_temp.fx('paid')),
  '5000 CNY 0.61220000', 'confirming a yuan bounty opens a yuan payment with the rate locked'
);
select is(
  public.bounty_detail(pg_temp.fx('done'), reference_currency => 'MYR') -> 'reference', 'null'::jsonb,
  'once a payment exists the detail shows no reference'
);

reset role;
select is(
  has_function_privilege('authenticated', 'public.payment_detail(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.payment_detail(uuid)', 'execute'),
  true, 'signed-in clients read payment details; anon cannot'
);

select * from finish();
rollback;

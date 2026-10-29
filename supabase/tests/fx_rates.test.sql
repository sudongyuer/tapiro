begin;
select plan(9);

insert into public.fx_rates (base, quote, rate_date, source, session, quote_per_base)
values ('CNY', 'MYR', '1999-01-04', 'bnm', '1700', 0.6122);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(
  (select quote_per_base from public.fx_rates where base = 'CNY' and quote = 'MYR' and rate_date = '1999-01-04'),
  0.61220000::numeric, 'signed-in users read the daily rate as MYR per CNY'
);
select is(
  (select array_agg(code || ' ' || minor_digits || ' ' || symbol order by code) from public.currencies where enabled),
  array['CNY 2 ¥', 'MYR 2 RM'], 'signed-in users read the offered currencies'
);
select throws_ok(
  $$insert into public.fx_rates (base, quote, rate_date, source, quote_per_base) values ('CNY', 'MYR', '1999-01-05', 'bnm', 1)$$,
  '42501', null, 'a client cannot write a rate'
);
select throws_ok($$update public.fx_rates set quote_per_base = 1$$, '42501', null, 'a client cannot change a rate');
select throws_ok($$update public.currencies set enabled = false$$, '42501', null, 'a client cannot change a currency');

set local role anon;
select throws_ok($$select * from public.fx_rates$$, '42501', null, 'anon cannot read rates');

reset role;
select throws_ok(
  $$insert into public.fx_rates (base, quote, rate_date, source, quote_per_base) values ('CNY', 'MYR', '1999-01-06', 'bnm', 0)$$,
  '23514', null, 'a rate is positive'
);
select throws_ok(
  $$insert into public.fx_rates (base, quote, rate_date, source, quote_per_base) values ('MYR', 'MYR', '1999-01-06', 'bnm', 1)$$,
  '23514', null, 'a rate joins two different currencies'
);

select is(
  (select count(*) from cron.job where jobname in ('fx-rate-daily', 'payment-proof-cleanup-daily')), 2::bigint,
  'the daily rate fetch and proof cleanup are scheduled'
);

select * from finish();
rollback;

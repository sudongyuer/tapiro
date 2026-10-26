begin;
select plan(6);

insert into public.fx_rates (rate_date, session, rm_per_cny) values ('1999-01-04', '1700', 0.6122);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select rm_per_cny from public.fx_rates where rate_date = '1999-01-04'), 0.612200::numeric, 'signed-in users read the daily rate');
select throws_ok($$insert into public.fx_rates (rate_date, session, rm_per_cny) values ('1999-01-05', '1700', 1)$$, '42501', null, 'a client cannot write a rate');
select throws_ok($$update public.fx_rates set rm_per_cny = 1$$, '42501', null, 'a client cannot change a rate');

set local role anon;
select throws_ok($$select * from public.fx_rates$$, '42501', null, 'anon cannot read rates');

reset role;
select throws_ok($$insert into public.fx_rates (rate_date, session, rm_per_cny) values ('1999-01-06', '1700', 0)$$, '23514', null, 'a rate is positive');

select is(
  (select count(*) from cron.job where jobname in ('fx-rate-daily', 'payment-proof-cleanup-daily')), 2::bigint,
  'the daily rate fetch and proof cleanup are scheduled'
);

select * from finish();
rollback;

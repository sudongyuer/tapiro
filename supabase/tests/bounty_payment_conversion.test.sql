begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}');

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

create function pg_temp.done_bounty(n text, minor bigint, currency text) returns void language sql as $$
  insert into fx values (n, gen_random_uuid());
  insert into public.bounties (
    id, poster_id, helper_id, title, category, reward_minor, reward_currency, expires_at, status, done_at
  )
  values (pg_temp.fx(n), pg_temp.u('a1'), pg_temp.u('b2'), '帮取快递', 'pickup', minor, currency,
    now() + interval '7 days', 'done', now());
$$;

create function pg_temp.payment(viewer text, n text, reference text) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(viewer));
  return public.bounty_detail(pg_temp.fx(n), reference_currency => reference) -> 'payment';
end;
$$;

delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 1, 'bnm', 0.61225);

select pg_temp.done_bounty('cny', 5000, 'CNY');
select pg_temp.done_bounty('myr', 800, 'MYR');
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select public.confirm_bounty(pg_temp.fx('cny'));
select public.confirm_bounty(pg_temp.fx('myr'));

select is(
  pg_temp.payment('a1', 'cny', 'MYR') - 'id',
  '{"state": "due", "amountMinor": 5000, "currency": "CNY", "converted": {"minor": 3062, "currency": "MYR"}}'::jsonb,
  'the poster sees ¥50 converted at the locked rate, 3061.25 sen rounded up'
);
select is(
  pg_temp.payment('b2', 'cny', 'MYR') -> 'converted', '{"minor": 3062, "currency": "MYR"}'::jsonb,
  'the helper sees the same locked conversion'
);
select is(
  pg_temp.payment('a1', 'myr', 'CNY') -> 'converted', '{"minor": 1307, "currency": "CNY"}'::jsonb,
  'RM 8 converts the other way, 1306.66 fen rounded up'
);

reset role;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today(), 'bnm', 0.7);
set local role authenticated;
select is(
  pg_temp.payment('a1', 'cny', 'MYR') -> 'converted' -> 'minor', '3062'::jsonb,
  'a newer rate never changes the locked conversion'
);
select is(
  pg_temp.payment('a1', 'cny', 'CNY') -> 'converted', 'null'::jsonb,
  'no conversion when the viewer''s currency is the payment''s'
);
select is(
  pg_temp.payment('a1', 'cny', null) -> 'converted', 'null'::jsonb,
  'no conversion without a reference currency'
);

reset role;
delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', pg_temp.today() - 8, 'bnm', 0.6122);
select pg_temp.done_bounty('stale', 5000, 'CNY');
set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select public.confirm_bounty(pg_temp.fx('stale'));
select is(
  pg_temp.payment('a1', 'stale', 'MYR') - 'id',
  '{"state": "due", "amountMinor": 5000, "currency": "CNY", "converted": null}'::jsonb,
  'a payment opened without a fresh rate has no conversion'
);

reset role;
select is(
  has_function_privilege('authenticated', 'private.bounty_payment(public.payments, text)', 'execute'),
  false, 'clients cannot call the payment helper directly'
);

select * from finish();
rollback;

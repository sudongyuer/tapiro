create table public.currencies (
  code char(3) primary key check (code ~ '^[A-Z]{3}$'),
  minor_digits smallint not null check (minor_digits between 0 and 4),
  symbol text not null check (char_length(symbol) between 1 and 4),
  enabled boolean not null default false
);

insert into public.currencies (code, minor_digits, symbol, enabled)
values ('MYR', 2, 'RM', true), ('CNY', 2, '¥', true);

create table public.post_limits (
  item_kind public.payment_item_kind not null,
  currency char(3) not null references public.currencies (code),
  min_minor bigint not null check (min_minor > 0),
  max_minor bigint not null,
  step_minor bigint not null check (step_minor > 0),
  primary key (item_kind, currency),
  constraint post_limits_range check (max_minor >= min_minor and (max_minor - min_minor) % step_minor = 0)
);

insert into public.post_limits (item_kind, currency, min_minor, max_minor, step_minor)
values ('bounty', 'MYR', 100, 50000, 100), ('bounty', 'CNY', 100, 80000, 100);

alter table public.currencies enable row level security;
alter table public.post_limits enable row level security;

revoke all on public.currencies, public.post_limits from anon, authenticated;
grant select on public.currencies, public.post_limits to authenticated;

create policy currencies_select_authenticated on public.currencies
  for select to authenticated
  using (true);

create policy post_limits_select_authenticated on public.post_limits
  for select to authenticated
  using (true);

alter table public.fx_rates drop constraint fx_rates_pkey;
alter table public.fx_rates rename column rm_per_cny to quote_per_base;
alter table public.fx_rates rename constraint fx_rates_rm_per_cny_check to fx_rates_quote_per_base_check;
alter table public.fx_rates alter column quote_per_base type numeric(18, 8);
alter table public.fx_rates alter column session drop not null;
alter table public.fx_rates
  add column base char(3) references public.currencies (code),
  add column quote char(3) references public.currencies (code),
  add column source text check (source ~ '^[a-z][a-z0-9_]{1,31}$');
update public.fx_rates set base = 'CNY', quote = 'MYR', source = 'bnm';
alter table public.fx_rates
  alter column base set not null,
  alter column quote set not null,
  alter column source set not null,
  add constraint fx_rates_pair check (base <> quote),
  add primary key (base, quote, rate_date, source);

alter table public.payments drop constraint payments_amount_sen_check;
alter table public.payments rename column amount_sen to amount_minor;
alter table public.payments alter column amount_minor type bigint;
alter table public.payments
  add constraint payments_amount_minor_check check (amount_minor > 0 and amount_minor <= 10000000),
  add column currency char(3) references public.currencies (code),
  add column rate_quote_per_base numeric(18, 8) check (rate_quote_per_base > 0),
  add column rate_base char(3) references public.currencies (code),
  add column rate_quote char(3) references public.currencies (code),
  add column rate_date date,
  add column rate_source text,
  add column paid_minor bigint check (paid_minor > 0),
  add column paid_currency char(3) references public.currencies (code);
update public.payments
set currency = 'MYR',
    paid_minor = case when state <> 'due' then amount_minor end,
    paid_currency = case when state <> 'due' then 'MYR' end;
alter table public.payments
  alter column currency set not null,
  add constraint payments_rate_locked check (
    num_nulls(rate_quote_per_base, rate_base, rate_quote, rate_date, rate_source) in (0, 5)
    and (rate_base is null or (rate_base <> rate_quote and currency in (rate_base, rate_quote)))
  ),
  add constraint payments_paid check (
    (paid_minor is null) = (paid_currency is null) and (state <> 'due' or paid_minor is null)
  );

alter table public.bounties drop constraint bounties_reward_sen_check;
alter table public.bounties rename column reward_sen to reward_minor;
alter table public.bounties alter column reward_minor type bigint;
alter table public.bounties add column reward_currency char(3) references public.currencies (code);
update public.bounties set reward_currency = 'MYR';
alter table public.bounties alter column reward_currency set not null;
grant select (reward_currency) on public.bounties to authenticated;

create function private.within_post_limits(
  kind public.payment_item_kind,
  amount bigint,
  currency text
) returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.post_limits l
    where l.item_kind = kind
      and l.currency = within_post_limits.currency
      and amount between l.min_minor and l.max_minor
      and (amount - l.min_minor) % l.step_minor = 0
  );
$$;

create function private.bounties_reward_within_limits() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.within_post_limits('bounty', new.reward_minor, new.reward_currency) then
    raise exception 'invalid_reward' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger bounties_reward_within_limits
  before insert or update of reward_minor, reward_currency on public.bounties
  for each row execute function private.bounties_reward_within_limits();

create function public.method_currency(type public.payee_method_type, item_currency text) returns char(3)
language sql
immutable
set search_path = ''
as $$
  select (case method_currency.type
    when 'duitnow_id' then 'MYR'
    when 'bank_account' then 'MYR'
    when 'duitnow_qr' then 'MYR'
    when 'alipay' then 'CNY'
    when 'wechat' then 'CNY'
    when 'cash' then item_currency
  end)::char(3);
$$;

create function private.fresh_rate(currency text, other text default null) returns public.fx_rates
language sql
stable
set search_path = ''
as $$
  select r.* from public.fx_rates r
  join public.currencies c on c.code = case when r.base = fresh_rate.currency then r.quote else r.base end
  where fresh_rate.currency in (r.base, r.quote)
    and (other is null or c.code = other)
    and c.enabled
    and r.rate_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date - 7
  order by r.rate_date desc, r.source = 'bnm' desc, r.fetched_at desc
  limit 1;
$$;

create function private.convert_minor(
  amount bigint,
  from_currency text,
  to_currency text,
  base text,
  quote text,
  quote_per_base numeric
) returns bigint
language sql
stable
set search_path = ''
as $$
  select case
    when from_currency = to_currency then amount
    else (
      select ceil(
        case
          when (from_currency, to_currency) = (base, quote) then amount * quote_per_base
          when (from_currency, to_currency) = (quote, base) then amount / quote_per_base
        end * power(10::numeric, t.minor_digits - f.minor_digits)
      )::bigint
      from public.currencies f, public.currencies t
      where f.code = from_currency and t.code = to_currency
    )
  end;
$$;

create function private.reference_money(amount bigint, currency text, target text) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  r public.fx_rates;
begin
  if target is null or target = currency then
    return null;
  end if;
  r := private.fresh_rate(currency, target);
  if r.base is null then
    return null;
  end if;
  return jsonb_build_object(
    'minor', private.convert_minor(amount, currency, target, r.base, r.quote, r.quote_per_base),
    'currency', target,
    'rateDate', r.rate_date
  );
end;
$$;

revoke all on function private.within_post_limits(public.payment_item_kind, bigint, text) from public, anon, authenticated;
revoke all on function private.bounties_reward_within_limits() from public, anon, authenticated;
revoke all on function private.fresh_rate(text, text) from public, anon, authenticated;
revoke all on function private.convert_minor(bigint, text, text, text, text, numeric) from public, anon, authenticated;
revoke all on function private.reference_money(bigint, text, text) from public, anon, authenticated;
revoke all on function public.method_currency(public.payee_method_type, text) from public, anon;
grant execute on function public.method_currency(public.payee_method_type, text) to authenticated;

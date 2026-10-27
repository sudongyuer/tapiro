create type public.coin_reason as enum (
  'new_user', 'onboarding_payee_method', 'onboarding_first_post', 'onboarding_first_help',
  'help_settled', 'post_spend', 'post_refund'
);

create table public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  reason public.coin_reason not null,
  delta integer not null check (delta <> 0 and delta between -100 and 100),
  item_kind public.payment_item_kind,
  item_id uuid,
  created_at timestamptz not null default now(),
  check ((item_id is null) = (item_kind is null))
);

create unique index coin_ledger_once on public.coin_ledger (user_id, reason)
  where reason in ('new_user', 'onboarding_payee_method', 'onboarding_first_post', 'onboarding_first_help');
create unique index coin_ledger_per_item on public.coin_ledger (user_id, reason, item_kind, item_id)
  where item_id is not null;
create index coin_ledger_user on public.coin_ledger (user_id, reason, created_at);

create function public.coin_ledger_append_only() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.user_id is not null and new.user_id is null and to_jsonb(new) - 'user_id' = to_jsonb(old) - 'user_id' then
      return new;
    end if;
  end if;
  raise exception 'ledger_is_append_only' using errcode = '55000';
end;
$$;

revoke all on function public.coin_ledger_append_only() from public, anon, authenticated;

create trigger coin_ledger_append_only
  before update or delete on public.coin_ledger
  for each row execute function public.coin_ledger_append_only();

create trigger coin_ledger_no_truncate
  before truncate on public.coin_ledger
  for each statement execute function public.coin_ledger_append_only();

alter table public.coin_ledger enable row level security;

revoke all on public.coin_ledger from anon, authenticated;
grant select on public.coin_ledger to authenticated;

create policy coin_ledger_select_own on public.coin_ledger
  for select to authenticated
  using (user_id = (select auth.uid()));

create type public.post_charge as enum ('free', 'coin');

create table public.post_charges (
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  charge public.post_charge not null,
  free_month date not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (item_kind, item_id)
);

create index post_charges_user_month on public.post_charges (user_id, free_month)
  where charge = 'free' and refunded_at is null;

alter table public.post_charges enable row level security;

revoke all on public.post_charges from anon, authenticated;

create function public.malaysia_month(at timestamptz) returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', at at time zone 'Asia/Kuala_Lumpur')::date;
$$;

revoke all on function public.malaysia_month(timestamptz) from public, anon, authenticated;
grant execute on function public.malaysia_month(timestamptz) to authenticated, service_role;

create function private.grant_coins(
  uid uuid,
  why public.coin_reason,
  amount integer,
  kind public.payment_item_kind default null,
  item uuid default null
) returns boolean
language sql
set search_path = ''
as $$
  with written as (
    insert into public.coin_ledger (user_id, reason, delta, item_kind, item_id)
    values (uid, why, amount, kind, item)
    on conflict do nothing
    returning 1
  )
  select exists (select 1 from written);
$$;

revoke all on function private.grant_coins(uuid, public.coin_reason, integer, public.payment_item_kind, uuid)
  from public, anon, authenticated;

create function public.spend_post(poster uuid, kind public.payment_item_kind, item uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.post_charges;
  month date := public.malaysia_month(now());
  charged public.post_charge;
begin
  if poster is null or kind is null or item is null then
    raise exception 'invalid_charge' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = poster) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  -- Serialises coin writes per user so two publishes cannot both take the last free slot or the last coin.
  perform pg_advisory_xact_lock(hashtextextended('coins:' || poster::text, 0));
  select * into stored from public.post_charges where item_kind = kind and item_id = item;
  if found then
    if stored.user_id is distinct from poster then
      raise exception 'item_charged_elsewhere' using errcode = '22023';
    end if;
    return stored.charge::text;
  end if;
  if (
    select count(*) from public.post_charges
    where user_id = poster and charge = 'free' and refunded_at is null and free_month = month
  ) < 3 then
    charged := 'free';
  elsif (select coalesce(sum(delta), 0) from public.coin_ledger where user_id = poster) >= 1 then
    charged := 'coin';
    perform private.grant_coins(poster, 'post_spend', -1, kind, item);
  else
    raise exception 'no_balance' using errcode = '55000';
  end if;
  begin
    insert into public.post_charges (item_kind, item_id, user_id, charge, free_month)
    values (kind, item, poster, charged, month);
  exception when unique_violation then
    raise exception 'item_charged_elsewhere' using errcode = '22023';
  end;
  perform private.grant_coins(poster, 'onboarding_first_post', 1);
  return charged::text;
end;
$$;

revoke all on function public.spend_post(uuid, public.payment_item_kind, uuid) from public, anon, authenticated;
grant execute on function public.spend_post(uuid, public.payment_item_kind, uuid) to service_role;

create function public.refund_post(kind public.payment_item_kind, item uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.post_charges;
begin
  if kind is null or item is null then
    raise exception 'invalid_charge' using errcode = '22023';
  end if;
  select * into stored from public.post_charges where item_kind = kind and item_id = item;
  if not found then
    raise exception 'charge_not_found' using errcode = 'P0002';
  end if;
  if stored.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('coins:' || stored.user_id::text, 0));
  end if;
  select * into stored from public.post_charges where item_kind = kind and item_id = item for update;
  if stored.refunded_at is not null then
    return stored.charge::text;
  end if;
  update public.post_charges set refunded_at = now() where item_kind = kind and item_id = item;
  if stored.charge = 'coin' and stored.user_id is not null then
    perform private.grant_coins(stored.user_id, 'post_refund', 1, kind, item);
  end if;
  return stored.charge::text;
end;
$$;

revoke all on function public.refund_post(public.payment_item_kind, uuid) from public, anon, authenticated;
grant execute on function public.refund_post(public.payment_item_kind, uuid) to service_role;

create function public.coin_balance() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'coins', (select coalesce(sum(delta), 0) from public.coin_ledger where user_id = (select auth.uid())),
    'freePostsLeft', greatest(0, 3 - (
      select count(*) from public.post_charges
      where user_id = (select auth.uid()) and charge = 'free' and refunded_at is null
        and free_month = public.malaysia_month(now())
    )),
    'freePostsPerMonth', 3,
    'nextFreeAt', (public.malaysia_month(now()) + interval '1 month') at time zone 'Asia/Kuala_Lumpur'
  );
$$;

revoke all on function public.coin_balance() from public, anon, authenticated;
grant execute on function public.coin_balance() to authenticated;

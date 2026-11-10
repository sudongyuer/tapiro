create table public.iap_products (
  product_id text primary key check (product_id <> ''),
  coins integer not null check (coins between 1 and 100)
);

alter table public.iap_products enable row level security;
revoke all on public.iap_products from anon, authenticated;

insert into public.iap_products (product_id, coins) values
  ('app.tapiro.coins.5', 5),
  ('app.tapiro.coins.11', 11),
  ('app.tapiro.coins.35', 35);

create type public.iap_environment as enum ('Production', 'Sandbox', 'Xcode', 'LocalTesting');

create table public.iap_transactions (
  transaction_id text primary key check (transaction_id <> ''),
  original_transaction_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  product_id text not null references public.iap_products (product_id),
  coins integer not null check (coins between 1 and 100),
  environment public.iap_environment not null,
  purchased_at timestamptz not null,
  credited_at timestamptz,
  revoked_at timestamptz,
  refund_reversed_at timestamptz,
  created_at timestamptz not null default now()
);

create index iap_transactions_user on public.iap_transactions (user_id);

create trigger iap_transactions_no_delete
  before delete on public.iap_transactions
  for each row execute function public.coin_ledger_append_only();

create trigger iap_transactions_no_truncate
  before truncate on public.iap_transactions
  for each statement execute function public.coin_ledger_append_only();

alter table public.iap_transactions enable row level security;
revoke all on public.iap_transactions from anon, authenticated;

create table public.iap_notifications (
  notification_uuid uuid primary key,
  notification_type text not null,
  subtype text,
  environment public.iap_environment not null,
  transaction_id text,
  signed_at timestamptz not null,
  outcome text not null,
  received_at timestamptz not null default now()
);

alter table public.iap_notifications enable row level security;
revoke all on public.iap_notifications from anon, authenticated;

alter table public.coin_ledger add column iap_transaction_id text references public.iap_transactions (transaction_id);
alter table public.coin_ledger add constraint coin_ledger_iap_link check (
  (iap_transaction_id is not null) = (reason in ('purchase', 'purchase_refund', 'purchase_refund_reversed'))
  and (iap_transaction_id is null or item_id is null)
);
create unique index coin_ledger_per_iap on public.coin_ledger (iap_transaction_id, reason)
  where iap_transaction_id is not null;

create function private.coins_of(uid uuid) returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::integer from public.coin_ledger where user_id = uid;
$$;

revoke all on function private.coins_of(uuid) from public, anon, authenticated;

create function private.iap_answer(status text, t public.iap_transactions) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'status', status,
    'transactionId', t.transaction_id,
    'productId', t.product_id,
    'coins', t.coins,
    'environment', t.environment,
    'balance', case when t.user_id is not null then private.coins_of(t.user_id) end
  );
$$;

revoke all on function private.iap_answer(text, public.iap_transactions) from public, anon, authenticated;

create function private.iap_lock(transaction text) returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('iap:' || transaction, 0));
$$;

revoke all on function private.iap_lock(text) from public, anon, authenticated;

create function private.iap_lock_coins(uid uuid) returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('coins:' || uid::text, 0)) where uid is not null;
$$;

revoke all on function private.iap_lock_coins(uuid) from public, anon, authenticated;

create function private.iap_pack(product text) returns public.iap_products
language plpgsql
stable
set search_path = ''
as $$
declare
  pack public.iap_products;
begin
  select * into pack from public.iap_products where product_id = product;
  if not found then
    raise exception 'unknown_product' using errcode = '22023';
  end if;
  return pack;
end;
$$;

revoke all on function private.iap_pack(text) from public, anon, authenticated;

create function private.iap_check_input(
  transaction text, product text, env public.iap_environment, purchased_at timestamptz
) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if transaction is null or transaction = '' or product is null or env is null or purchased_at is null then
    raise exception 'invalid_transaction' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.iap_check_input(text, text, public.iap_environment, timestamptz)
  from public, anon, authenticated;

create function private.iap_claim(buyer uuid, stored public.iap_transactions) returns public.iap_transactions
language plpgsql
set search_path = ''
as $$
begin
  if buyer is null or stored.user_id = buyer then
    return stored;
  end if;
  if stored.user_id is null and stored.credited_at is null then
    update public.iap_transactions set user_id = buyer where transaction_id = stored.transaction_id
    returning * into stored;
    return stored;
  end if;
  raise exception 'transaction_owned_elsewhere' using errcode = '42501';
end;
$$;

revoke all on function private.iap_claim(uuid, public.iap_transactions) from public, anon, authenticated;

-- Lock order is always the transaction, then the owner's coins, so credit, revoke and reinstate cannot deadlock each
-- other or spend_post.
create function public.iap_credit(
  buyer uuid,
  transaction text,
  original_transaction text,
  product text,
  env public.iap_environment,
  purchased_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack public.iap_products;
  stored public.iap_transactions;
begin
  perform private.iap_check_input(transaction, product, env, purchased_at);
  if buyer is null or not exists (select 1 from public.profiles where id = buyer) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  pack := private.iap_pack(product);
  perform private.iap_lock(transaction);
  perform private.iap_lock_coins(buyer);
  select * into stored from public.iap_transactions where transaction_id = transaction for update;
  if found then
    stored := private.iap_claim(buyer, stored);
    if stored.credited_at is not null or (stored.revoked_at is not null and stored.refund_reversed_at is null) then
      return private.iap_answer(case when stored.credited_at is null then 'revoked' else 'duplicate' end, stored);
    end if;
    update public.iap_transactions set credited_at = now() where transaction_id = transaction returning * into stored;
  else
    insert into public.iap_transactions (
      transaction_id, original_transaction_id, user_id, product_id, coins, environment, purchased_at, credited_at
    ) values (
      transaction, coalesce(original_transaction, transaction), buyer, product, pack.coins, env, purchased_at, now()
    ) returning * into stored;
  end if;
  insert into public.coin_ledger (user_id, reason, delta, iap_transaction_id)
  values (buyer, 'purchase', stored.coins, transaction);
  return private.iap_answer('credited', stored);
end;
$$;

revoke all on function public.iap_credit(uuid, text, text, text, public.iap_environment, timestamptz)
  from public, anon, authenticated;
grant execute on function public.iap_credit(uuid, text, text, text, public.iap_environment, timestamptz)
  to service_role;

create function public.iap_revoke(
  buyer uuid,
  transaction text,
  original_transaction text,
  product text,
  env public.iap_environment,
  purchased_at timestamptz,
  revoked timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack public.iap_products;
  stored public.iap_transactions;
begin
  perform private.iap_check_input(transaction, product, env, purchased_at);
  if revoked is null then
    raise exception 'invalid_transaction' using errcode = '22023';
  end if;
  pack := private.iap_pack(product);
  perform private.iap_lock(transaction);
  select * into stored from public.iap_transactions where transaction_id = transaction for update;
  if not found then
    insert into public.iap_transactions (
      transaction_id, original_transaction_id, user_id, product_id, coins, environment, purchased_at, revoked_at
    ) values (
      transaction, coalesce(original_transaction, transaction), buyer, product, pack.coins, env, purchased_at, revoked
    ) returning * into stored;
    return private.iap_answer('revoked', stored);
  end if;
  stored := private.iap_claim(buyer, stored);
  if stored.revoked_at is not null or stored.refund_reversed_at is not null then
    return private.iap_answer('duplicate', stored);
  end if;
  perform private.iap_lock_coins(stored.user_id);
  update public.iap_transactions set revoked_at = revoked where transaction_id = transaction returning * into stored;
  if stored.credited_at is not null and stored.user_id is not null then
    insert into public.coin_ledger (user_id, reason, delta, iap_transaction_id)
    values (stored.user_id, 'purchase_refund', -stored.coins, transaction);
  end if;
  return private.iap_answer('revoked', stored);
end;
$$;

revoke all on function public.iap_revoke(uuid, text, text, text, public.iap_environment, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.iap_revoke(uuid, text, text, text, public.iap_environment, timestamptz, timestamptz)
  to service_role;

create function private.iap_reinstate(transaction text, reversed timestamptz) returns text
language plpgsql
set search_path = ''
as $$
declare
  stored public.iap_transactions;
begin
  perform private.iap_lock(transaction);
  select * into stored from public.iap_transactions where transaction_id = transaction for update;
  if not found then
    return 'unknown_transaction';
  end if;
  if stored.refund_reversed_at is not null then
    return 'duplicate';
  end if;
  perform private.iap_lock_coins(stored.user_id);
  update public.iap_transactions set refund_reversed_at = reversed where transaction_id = transaction
  returning * into stored;
  if stored.revoked_at is not null and stored.credited_at is not null and stored.user_id is not null then
    insert into public.coin_ledger (user_id, reason, delta, iap_transaction_id)
    values (stored.user_id, 'purchase_refund_reversed', stored.coins, transaction);
  end if;
  return 'reinstated';
end;
$$;

revoke all on function private.iap_reinstate(text, timestamptz) from public, anon, authenticated;

create function public.iap_apply_notification(
  notification uuid,
  kind text,
  sub text,
  env public.iap_environment,
  signed_at timestamptz,
  transaction text default null,
  original_transaction text default null,
  product text default null,
  purchased_at timestamptz default null,
  revoked timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if notification is null or kind is null or env is null or signed_at is null then
    raise exception 'invalid_notification' using errcode = '22023';
  end if;
  insert into public.iap_notifications (
    notification_uuid, notification_type, subtype, environment, transaction_id, signed_at, outcome
  ) values (notification, kind, sub, env, transaction, signed_at, 'received')
  on conflict (notification_uuid) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if kind = 'REFUND' and transaction is not null then
    result := public.iap_revoke(
      null, transaction, original_transaction, product, env, purchased_at, coalesce(revoked, signed_at)
    ) ->> 'status';
  elsif kind = 'REFUND_REVERSED' and transaction is not null then
    result := private.iap_reinstate(transaction, signed_at);
  else
    result := 'ignored';
  end if;
  update public.iap_notifications set outcome = result
  where notification_uuid = notification;
  return jsonb_build_object('status', result);
end;
$$;

revoke all on function public.iap_apply_notification(
  uuid, text, text, public.iap_environment, timestamptz, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.iap_apply_notification(
  uuid, text, text, public.iap_environment, timestamptz, text, text, text, timestamptz, timestamptz
) to service_role;

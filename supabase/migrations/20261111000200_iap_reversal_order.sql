-- Apple does not order notifications, and the app may verify before or after either of them. A reversal for a
-- transaction not seen yet is stored on a new row, so the later refund answers duplicate and the later credit pays;
-- a reversal of a refund that reached the app before any credit pays the pack then.
create function private.iap_reinstate(
  transaction text,
  original_transaction text,
  product text,
  env public.iap_environment,
  purchased_at timestamptz,
  reversed timestamptz
) returns text
language plpgsql
set search_path = ''
as $$
declare
  pack public.iap_products;
  stored public.iap_transactions;
begin
  perform private.iap_check_input(transaction, product, env, purchased_at);
  pack := private.iap_pack(product);
  perform private.iap_lock(transaction);
  select * into stored from public.iap_transactions where transaction_id = transaction for update;
  if not found then
    insert into public.iap_transactions (
      transaction_id, original_transaction_id, user_id, product_id, coins, environment, purchased_at,
      refund_reversed_at
    ) values (
      transaction, coalesce(original_transaction, transaction), null, product, pack.coins, env, purchased_at, reversed
    );
    return 'reinstated';
  end if;
  if stored.refund_reversed_at is not null then
    return 'duplicate';
  end if;
  perform private.iap_lock_coins(stored.user_id);
  if stored.revoked_at is not null and stored.credited_at is null and stored.user_id is not null then
    update public.iap_transactions set refund_reversed_at = reversed, credited_at = now()
    where transaction_id = transaction returning * into stored;
    insert into public.coin_ledger (user_id, reason, delta, iap_transaction_id)
    values (stored.user_id, 'purchase', stored.coins, transaction);
    return 'reinstated';
  end if;
  update public.iap_transactions set refund_reversed_at = reversed where transaction_id = transaction
  returning * into stored;
  if stored.revoked_at is not null and stored.credited_at is not null and stored.user_id is not null then
    insert into public.coin_ledger (user_id, reason, delta, iap_transaction_id)
    values (stored.user_id, 'purchase_refund_reversed', stored.coins, transaction);
  end if;
  return 'reinstated';
end;
$$;

revoke all on function private.iap_reinstate(text, text, text, public.iap_environment, timestamptz, timestamptz)
  from public, anon, authenticated;

create or replace function public.iap_apply_notification(
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
    result := private.iap_reinstate(transaction, original_transaction, product, env, purchased_at, signed_at);
  else
    result := 'ignored';
  end if;
  update public.iap_notifications set outcome = result
  where notification_uuid = notification;
  return jsonb_build_object('status', result);
end;
$$;

drop function private.iap_reinstate(text, timestamptz);

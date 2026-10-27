create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
begin
  raw_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  )), '');
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(raw_name, 'Tapiro'), 40));
  perform private.grant_coins(new.id, 'new_user', 5);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create function public.payee_methods_after_insert() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_coins(new.user_id, 'onboarding_payee_method', 1);
  return null;
end;
$$;

revoke all on function public.payee_methods_after_insert() from public, anon, authenticated;

create trigger payee_methods_onboarding_grant
  after insert on public.payee_methods
  for each row execute function public.payee_methods_after_insert();

create function private.grant_help_settled(payment uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  p public.payments;
begin
  select * into p from public.payments
  where id = payment and item_kind = 'bounty' and reverses is null and state = 'settled' and payee_id is not null;
  if not found then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('coins:' || p.payee_id::text, 0));
  perform private.grant_coins(p.payee_id, 'onboarding_first_help', 1);
  if (
    select count(*) from public.coin_ledger
    where user_id = p.payee_id and reason = 'help_settled'
      and public.malaysia_month(created_at) = public.malaysia_month(now())
  ) < 10 then
    perform private.grant_coins(p.payee_id, 'help_settled', 1, 'bounty', p.item_id);
  end if;
end;
$$;

revoke all on function private.grant_help_settled(uuid) from public, anon, authenticated;

create function private.backfill_coin_grants() returns integer
language plpgsql
set search_path = ''
as $$
declare
  users_granted integer;
  methods_granted integer;
begin
  insert into public.coin_ledger (user_id, reason, delta)
  select id, 'new_user', 5 from auth.users
  on conflict do nothing;
  get diagnostics users_granted = row_count;
  insert into public.coin_ledger (user_id, reason, delta)
  select distinct user_id, 'onboarding_payee_method'::public.coin_reason, 1 from public.payee_methods
  on conflict do nothing;
  get diagnostics methods_granted = row_count;
  return users_granted + methods_granted;
end;
$$;

revoke all on function private.backfill_coin_grants() from public, anon, authenticated;

select private.backfill_coin_grants();

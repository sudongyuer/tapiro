create type public.payee_method_type as enum (
  'duitnow_id', 'bank_account', 'duitnow_qr', 'alipay', 'wechat', 'cash'
);

create table public.payee_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.payee_method_type not null,
  is_default boolean not null default false,
  display_name text check (char_length(btrim(display_name)) between 1 and 60),
  phone text check (phone ~ '^\+601[0-9]{8,9}$'),
  bank_code text check (bank_code ~ '^[0-9]{6}$'),
  bank_name text check (char_length(btrim(bank_name)) between 1 and 60),
  account_number text check (account_number ~ '^[0-9]{6,20}$'),
  qr_payload text check (char_length(qr_payload) between 1 and 512),
  acquirer_id text check (acquirer_id ~ '^[0-9]{6}$'),
  mcc text check (mcc ~ '^[0-9]{4}$'),
  qr_name text check (char_length(btrim(qr_name)) between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_at timestamptz not null default now(),
  constraint payee_methods_shape check (
    case type
      when 'duitnow_id' then phone is not null and display_name is not null
        and num_nulls(bank_code, bank_name, account_number, qr_payload, acquirer_id, mcc, qr_name) = 7
      when 'bank_account' then num_nulls(bank_code, bank_name) = 1 and account_number is not null
        and display_name is not null
        and num_nulls(phone, qr_payload, acquirer_id, mcc, qr_name) = 5
      when 'duitnow_qr' then qr_payload is not null and acquirer_id is not null and mcc is not null
        and qr_name is not null
        and num_nulls(display_name, phone, bank_code, bank_name, account_number) = 5
      when 'cash' then not is_default
        and num_nulls(display_name, phone, bank_code, bank_name, account_number, qr_payload, acquirer_id, mcc, qr_name) = 9
      else qr_payload is not null
        and num_nulls(display_name, phone, bank_code, bank_name, account_number, acquirer_id, mcc, qr_name) = 8
    end
  )
);

create unique index payee_methods_one_default on public.payee_methods (user_id) where is_default;
create unique index payee_methods_one_cash on public.payee_methods (user_id) where type = 'cash';
create index payee_methods_user on public.payee_methods (user_id, created_at);

alter table public.payee_methods enable row level security;

revoke all on public.payee_methods from anon, authenticated;
grant select, delete on public.payee_methods to authenticated;
grant insert (
  id, user_id, type, display_name, phone, bank_code, bank_name, account_number, qr_payload, acquirer_id,
  mcc, qr_name
) on public.payee_methods to authenticated;
grant update (
  display_name, phone, bank_code, bank_name, account_number, qr_payload, acquirer_id, mcc, qr_name,
  checked_at
) on public.payee_methods to authenticated;

create policy payee_methods_select_own on public.payee_methods
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy payee_methods_insert_own on public.payee_methods
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy payee_methods_update_own on public.payee_methods
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy payee_methods_delete_own on public.payee_methods
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger payee_methods_set_updated_at
  before update on public.payee_methods
  for each row execute function public.set_updated_at();

create function public.payee_methods_before_insert() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_default := new.type <> 'cash' and not exists (
    select 1 from public.payee_methods where user_id = new.user_id and is_default
  );
  new.checked_at := now();
  return new;
end;
$$;

create trigger payee_methods_first_is_default
  before insert on public.payee_methods
  for each row execute function public.payee_methods_before_insert();

-- Clients cannot choose checked_at: any change to it, or to the QR string, stamps the server time.
create function public.payee_methods_touch_checked() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.qr_payload is distinct from old.qr_payload or new.checked_at is distinct from old.checked_at then
    new.checked_at := now();
  end if;
  return new;
end;
$$;

create trigger payee_methods_qr_rechecked
  before update on public.payee_methods
  for each row execute function public.payee_methods_touch_checked();

create function public.payee_methods_after_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.payee_methods set is_default = true
    where id = (
      select id from public.payee_methods
      where user_id = old.user_id and type <> 'cash'
      order by created_at, id
      limit 1
    );
  end if;
  return null;
end;
$$;

revoke all on function public.payee_methods_after_delete() from public, anon, authenticated;

create trigger payee_methods_promote_default
  after delete on public.payee_methods
  for each row execute function public.payee_methods_after_delete();

create function public.set_default_payee_method(method_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.payee_methods
  where id = method_id and type <> 'cash' and user_id = (select auth.uid());
  if owner is null then
    raise exception 'payee method not found' using errcode = 'P0002';
  end if;
  update public.payee_methods set is_default = false where user_id = owner and is_default;
  update public.payee_methods set is_default = true where id = method_id;
end;
$$;

revoke all on function public.set_default_payee_method(uuid) from public, anon;
grant execute on function public.set_default_payee_method(uuid) to authenticated;

create function public.replace_payee_qr(
  method_id uuid,
  new_type public.payee_method_type,
  new_payload text,
  new_acquirer_id text default null,
  new_mcc text default null,
  new_qr_name text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.payee_methods;
  new_id uuid;
begin
  if new_type not in ('duitnow_qr', 'alipay', 'wechat') then
    raise exception 'not a QR type' using errcode = '22023';
  end if;
  select * into old_row from public.payee_methods
  where id = method_id and user_id = (select auth.uid())
    and type in ('duitnow_qr', 'alipay', 'wechat')
  for update;
  if not found then
    raise exception 'payee method not found' using errcode = 'P0002';
  end if;
  update public.payee_methods set is_default = false where id = method_id;
  delete from public.payee_methods where id = method_id;
  insert into public.payee_methods (user_id, type, qr_payload, acquirer_id, mcc, qr_name, created_at)
  values (old_row.user_id, new_type, new_payload, new_acquirer_id, new_mcc, new_qr_name, old_row.created_at)
  returning id into new_id;
  if old_row.is_default then
    update public.payee_methods set is_default = false where user_id = old_row.user_id and is_default;
    update public.payee_methods set is_default = true where id = new_id;
  end if;
  return new_id;
end;
$$;

revoke all on function public.replace_payee_qr(uuid, public.payee_method_type, text, text, text, text)
  from public, anon;
grant execute on function public.replace_payee_qr(uuid, public.payee_method_type, text, text, text, text)
  to authenticated;

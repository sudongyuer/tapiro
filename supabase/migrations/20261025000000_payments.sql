create type public.payment_state as enum ('due', 'marked_paid', 'settled', 'disputed');
create type public.payment_item_kind as enum ('bounty', 'ride');
create type public.payment_event_kind as enum ('opened', 'marked_paid', 'undone', 'nudged', 'settled');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  payer_id uuid references auth.users (id) on delete set null,
  payee_id uuid references auth.users (id) on delete set null,
  amount_sen integer not null check (amount_sen > 0 and amount_sen <= 10000000),
  reference text not null check (reference ~ '^TP-[A-HJ-NP-Z2-9]{4}$'),
  state public.payment_state not null default 'due',
  method_id uuid references public.payee_methods (id) on delete set null,
  method_type public.payee_method_type,
  proof_path text check (char_length(proof_path) between 1 and 200),
  reverses uuid unique references public.payments (id),
  nudged_at timestamptz,
  marked_paid_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_two_people check (payer_id <> payee_id),
  constraint payments_marked check (
    case state
      when 'due' then marked_paid_at is null and method_type is null
      when 'marked_paid' then marked_paid_at is not null and method_type is not null
      else true
    end
  ),
  constraint payments_settled check ((state = 'settled') = (settled_at is not null))
);

create unique index payments_unsettled_reference on public.payments (payee_id, reference)
  where state <> 'settled';
create index payments_payer on public.payments (payer_id, state);
create index payments_payee on public.payments (payee_id, state);
create index payments_item on public.payments (item_kind, item_id);

create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid not null references public.payments (id) on delete cascade,
  kind public.payment_event_kind not null,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payment_events_payment on public.payment_events (payment_id, id);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

revoke all on public.payments, public.payment_events from anon, authenticated;
grant select on public.payments, public.payment_events to authenticated;

create policy payments_select_parties on public.payments
  for select to authenticated
  using ((select auth.uid()) in (payer_id, payee_id));

create policy payment_events_select_parties on public.payment_events
  for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id and (select auth.uid()) in (p.payer_id, p.payee_id)
  ));

create policy payee_methods_select_payer on public.payee_methods
  for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.payee_id = payee_methods.user_id
      and p.payer_id = (select auth.uid())
      and p.state <> 'settled'
  ));

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create function public.payments_guard_amount() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.amount_sen <> old.amount_sen and old.state <> 'due' then
    raise exception 'the amount changes only while the payment is due' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger payments_amount_only_when_due
  before update on public.payments
  for each row execute function public.payments_guard_amount();

-- Alphabet without 0/O/1/I so a reference read aloud or typed into a bank remark is unambiguous.
create function public.new_payment_reference(payee uuid) returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'TP-' || (
      select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 4)
    );
    exit when not exists (
      select 1 from public.payments
      where payee_id = payee and reference = candidate and state <> 'settled'
    );
  end loop;
  return candidate;
end;
$$;

revoke all on function public.new_payment_reference(uuid) from public, anon, authenticated;

create function public.log_payment_event(payment uuid, event public.payment_event_kind, actor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.payment_events (payment_id, kind, actor_id) values (payment, event, actor);
$$;

revoke all on function public.log_payment_event(uuid, public.payment_event_kind, uuid)
  from public, anon, authenticated;

-- Opened by the bounty and ride features' server code when an item becomes payable; never by a client.
create function public.open_payment(
  kind public.payment_item_kind,
  item uuid,
  item_title text,
  payer uuid,
  payee uuid,
  amount integer,
  reversing uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.payments (item_kind, item_id, title, payer_id, payee_id, amount_sen, reference, reverses)
  values (kind, item, item_title, payer, payee, amount, public.new_payment_reference(payee), reversing)
  returning id into new_id;
  perform public.log_payment_event(new_id, 'opened', null);
  return new_id;
end;
$$;

revoke all on function public.open_payment(public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.open_payment(public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid)
  to service_role;

-- A cancelled prepaid item: the helper pays the poster back; the cancellation completes when this settles.
create function public.open_reverse_payment(original uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid public.payments;
begin
  select * into paid from public.payments where id = original for update;
  if not found or paid.state <> 'settled' then
    raise exception 'only a settled payment can be reversed' using errcode = '22023';
  end if;
  if paid.reverses is not null then
    raise exception 'a reverse payment cannot be reversed' using errcode = '22023';
  end if;
  return public.open_payment(
    paid.item_kind, paid.item_id, paid.title, paid.payee_id, paid.payer_id, paid.amount_sen, paid.id
  );
end;
$$;

revoke all on function public.open_reverse_payment(uuid) from public, anon, authenticated;
grant execute on function public.open_reverse_payment(uuid) to service_role;

create function public.set_payment_amount(payment uuid, amount integer) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments set amount_sen = amount where id = payment;
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_payment_amount(uuid, integer) from public, anon, authenticated;
grant execute on function public.set_payment_amount(uuid, integer) to service_role;

create function public.locked_payment(payment uuid) returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
begin
  select * into p from public.payments
  where id = payment and (select auth.uid()) in (payer_id, payee_id)
  for update;
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

revoke all on function public.locked_payment(uuid) from public, anon, authenticated;

create function public.mark_payment_paid(payment uuid, method uuid, proof text default null)
returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  chosen public.payee_method_type;
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer marks a payment paid' using errcode = '42501';
  end if;
  if p.state <> 'due' then
    raise exception 'payment is not due' using errcode = '55000';
  end if;
  select type into chosen from public.payee_methods
  where id = method and user_id = p.payee_id and type <> 'cash';
  if chosen is null then
    raise exception 'not a transfer method of the payee' using errcode = '22023';
  end if;
  if proof is not null and split_part(proof, '/', 1) <> p.id::text then
    raise exception 'proof belongs to another payment' using errcode = '22023';
  end if;
  update public.payments
  set state = 'marked_paid', method_id = method, method_type = chosen, proof_path = proof,
      marked_paid_at = now(), nudged_at = null
  where id = p.id;
  perform public.log_payment_event(p.id, 'marked_paid', p.payer_id);
  return 'marked_paid';
end;
$$;

create function public.undo_marked_paid(payment uuid) returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer undoes 我已付款' using errcode = '42501';
  end if;
  if p.state <> 'marked_paid' then
    raise exception 'payment is not marked paid' using errcode = '55000';
  end if;
  update public.payments
  set state = 'due', method_id = null, method_type = null, proof_path = null,
      marked_paid_at = null, nudged_at = null
  where id = p.id;
  perform public.log_payment_event(p.id, 'undone', p.payer_id);
  return 'due';
end;
$$;

-- From due only for cash in person, which the payee alone settles.
create function public.confirm_payment_received(payment uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  first boolean;
begin
  if p.payee_id is distinct from (select auth.uid()) then
    raise exception 'only the payee confirms' using errcode = '42501';
  end if;
  if p.state = 'due' then
    if not exists (select 1 from public.payee_methods where user_id = p.payee_id and type = 'cash') then
      raise exception 'the payer has not marked it paid' using errcode = '55000';
    end if;
  elsif p.state <> 'marked_paid' then
    raise exception 'payment cannot be settled' using errcode = '55000';
  end if;
  first := not exists (
    select 1 from public.payments
    where payee_id = p.payee_id and state = 'settled' and id <> p.id
  );
  update public.payments
  set state = 'settled', settled_at = now(), method_type = coalesce(method_type, 'cash')
  where id = p.id;
  perform public.log_payment_event(p.id, 'settled', p.payee_id);
  return jsonb_build_object('state', 'settled', 'firstSettled', first);
end;
$$;

create function public.report_not_received(payment uuid) returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
begin
  if p.payee_id is distinct from (select auth.uid()) then
    raise exception 'only the payee reports not received' using errcode = '42501';
  end if;
  if p.state <> 'marked_paid' then
    raise exception 'payment is not marked paid' using errcode = '55000';
  end if;
  update public.payments set nudged_at = now() where id = p.id;
  perform public.log_payment_event(p.id, 'nudged', p.payee_id);
  return 'marked_paid';
end;
$$;

-- Unpaid: still due, or marked paid after the payee said 还没收到. Mirrors src/lib/unpaid.ts.
create function public.publish_blocked() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with unpaid as (
    select created_at from public.payments
    where payer_id = (select auth.uid())
      and (state = 'due' or (state = 'marked_paid' and nudged_at is not null))
  )
  select count(*) >= 2 or coalesce(min(created_at) <= now() - interval '7 days', false) from unpaid;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'mark_payment_paid(uuid, uuid, text)', 'undo_marked_paid(uuid)', 'confirm_payment_received(uuid)',
    'report_not_received(uuid)', 'publish_blocked()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

create function public.expired_payment_proofs() returns table (payment_id uuid, proof_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, proof_path from public.payments
  where state = 'settled' and proof_path is not null and settled_at <= now() - interval '30 days';
$$;

create function public.clear_payment_proof(payment uuid) returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set proof_path = null where id = payment and state = 'settled';
$$;

revoke all on function public.expired_payment_proofs() from public, anon, authenticated;
revoke all on function public.clear_payment_proof(uuid) from public, anon, authenticated;
grant execute on function public.expired_payment_proofs() to service_role;
grant execute on function public.clear_payment_proof(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/heic']);

create policy payment_proofs_insert_payer on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs' and exists (
      select 1 from public.payments p
      where p.id::text = (storage.foldername(name))[1]
        and p.payer_id = (select auth.uid())
        and p.state = 'due'
    )
  );

create policy payment_proofs_select_parties on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs' and exists (
      select 1 from public.payments p
      where p.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) in (p.payer_id, p.payee_id)
    )
  );

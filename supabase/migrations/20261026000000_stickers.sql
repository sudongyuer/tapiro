create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  item_kind public.payment_item_kind not null,
  category text check (char_length(btrim(category)) between 1 and 40),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  earned_at timestamptz not null default now()
);

create index stickers_owner on public.stickers (owner_id, earned_at desc);

alter table public.stickers enable row level security;

revoke all on public.stickers from anon, authenticated;
grant select on public.stickers to authenticated;

create policy stickers_select_own on public.stickers
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- Payments settled before stickers existed earn theirs here, so the count and the first-settle flag agree.
create function public.award_missing_stickers() returns integer
language sql
security definer
set search_path = ''
as $$
  with awarded as (
    insert into public.stickers (owner_id, payment_id, item_kind, title, earned_at)
    select payee_id, id, item_kind, title, settled_at
    from public.payments
    where state = 'settled' and reverses is null and payee_id is not null
    on conflict (payment_id) do nothing
    returning 1
  )
  select count(*)::integer from awarded;
$$;

revoke all on function public.award_missing_stickers() from public, anon, authenticated;
grant execute on function public.award_missing_stickers() to service_role;

select public.award_missing_stickers();

-- A reverse payment returns money for a cancelled item; it earns no sticker and is never a first settle.
create or replace function public.confirm_payment_received(payment uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  total integer;
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
  update public.payments
  set state = 'settled', settled_at = now(), method_type = coalesce(method_type, 'cash')
  where id = p.id;
  perform public.log_payment_event(p.id, 'settled', p.payee_id);
  -- Serialises settles to one payee so concurrent settles return distinct counts and one first settle.
  perform pg_advisory_xact_lock(hashtextextended(p.payee_id::text, 0));
  if p.reverses is null then
    insert into public.stickers (owner_id, payment_id, item_kind, title)
    values (p.payee_id, p.id, p.item_kind, p.title)
    on conflict (payment_id) do nothing;
  end if;
  select count(*) into total from public.stickers where owner_id = p.payee_id;
  return jsonb_build_object(
    'state', 'settled',
    'firstSettled', p.reverses is null and total = 1,
    'stickerCount', total
  );
end;
$$;

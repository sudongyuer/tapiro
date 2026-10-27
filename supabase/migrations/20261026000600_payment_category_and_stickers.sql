create domain public.bounty_category as text
  check (value in ('pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other'));

do $$
declare
  duplicated integer;
begin
  select count(*) into duplicated from (
    select 1 from public.payments where reverses is null group by item_kind, item_id having count(*) > 1
  ) as items;
  if duplicated > 0 then
    raise exception '% items hold more than one forward payment', duplicated using errcode = '23505';
  end if;
end;
$$;

do $$
declare
  unknown integer;
begin
  select count(*) into unknown from public.stickers
  where category is not null
    and category not in ('pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other');
  if unknown > 0 then
    raise exception '% stickers hold a category outside the bounty categories', unknown using errcode = '23514';
  end if;
end;
$$;

alter table public.payments add column category public.bounty_category;
alter table public.payments add constraint payments_category_bounty
  check (category is null or (item_kind = 'bounty' and reverses is null));

create unique index payments_one_forward_per_item on public.payments (item_kind, item_id) where reverses is null;

drop function public.open_payment(public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid);

-- Two concurrent opens can draw the same free reference; the partial unique index decides, and the loser retries.
create function public.open_payment(
  kind public.payment_item_kind,
  item uuid,
  item_title text,
  payer uuid,
  payee uuid,
  amount integer,
  reversing uuid default null,
  item_category public.bounty_category default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  violated text;
begin
  for attempt in 1..8 loop
    begin
      insert into public.payments (
        item_kind, item_id, title, payer_id, payee_id, amount_sen, reference, reverses, category
      )
      values (
        kind, item, item_title, payer, payee, amount, public.new_payment_reference(payee), reversing, item_category
      )
      returning id into new_id;
      perform public.log_payment_event(new_id, 'opened', null);
      return new_id;
    exception when unique_violation then
      get stacked diagnostics violated = constraint_name;
      if violated = 'payments_one_forward_per_item' then
        raise exception 'payment_exists' using errcode = '23505';
      elsif violated <> 'payments_unsettled_reference' then
        raise;
      end if;
    end;
  end loop;
  raise exception 'no free payment reference' using errcode = '23505';
end;
$$;

revoke all on function public.open_payment(
  public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid, public.bounty_category
) from public, anon, authenticated;
grant execute on function public.open_payment(
  public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid, public.bounty_category
) to service_role;

create or replace function public.open_reverse_payment(original uuid) returns uuid
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

create type public.sticker_role as enum ('payee', 'payer');

alter table public.stickers add column role public.sticker_role not null default 'payee';
alter table public.stickers alter column role drop default;
alter table public.stickers drop constraint stickers_payment_id_key;
alter table public.stickers add constraint stickers_payment_owner unique (payment_id, owner_id);
alter table public.stickers drop constraint stickers_category_check;
alter table public.stickers alter column category type public.bounty_category using category::public.bounty_category;

create or replace function public.award_missing_stickers() returns integer
language sql
security definer
set search_path = ''
as $$
  with awarded as (
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title, earned_at)
    select side.owner_id, p.id, side.role, p.item_kind, p.category, p.title, p.settled_at
    from public.payments p
    cross join lateral (
      values (p.payee_id, 'payee'::public.sticker_role), (p.payer_id, 'payer'::public.sticker_role)
    ) as side (owner_id, role)
    where p.state = 'settled' and p.reverses is null and side.owner_id is not null
    on conflict (payment_id, owner_id) do nothing
    returning 1
  )
  select count(*)::integer from awarded;
$$;

select public.award_missing_stickers();

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
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title)
    values (p.payee_id, p.id, 'payee', p.item_kind, p.category, p.title)
    on conflict (payment_id, owner_id) do nothing;
  end if;
  select count(*) into total from public.stickers where owner_id = p.payee_id;
  return jsonb_build_object(
    'state', 'settled',
    'firstSettled', p.reverses is null and total = 1,
    'stickerCount', total
  );
end;
$$;

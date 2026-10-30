alter table public.stickers add column collected_at timestamptz;

update public.stickers set collected_at = earned_at where role = 'payer';

create index stickers_uncollected on public.stickers (owner_id, earned_at desc)
  where role = 'payer' and collected_at is null;

-- Stickers awarded late belong to old settles; their payer side is born collected so no stale card appears.
create or replace function public.award_missing_stickers() returns integer
language sql
security definer
set search_path = ''
as $$
  with awarded as (
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title, earned_at, collected_at)
    select side.owner_id, p.id, side.role, p.item_kind, p.category, p.title, p.settled_at,
      case when side.role = 'payer' then p.settled_at end
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

-- The counterpart's name is read live, so a deleted account (its payment party set null) reads as no name.
create function public.sticker_book() returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'paymentId', s.payment_id,
    'role', s.role,
    'itemKind', s.item_kind,
    'category', s.category,
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name
  )
  from public.stickers s
  join public.payments p on p.id = s.payment_id
  left join public.profiles pr
    on pr.id = case when s.role = 'payee' then p.payer_id else p.payee_id end
  where s.owner_id = (select auth.uid())
  order by s.earned_at desc, s.id desc;
$$;

create function public.settled_cards() returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  update public.stickers
  set collected_at = now()
  where owner_id = uid and role = 'payer' and collected_at is null and earned_at <= now() - interval '7 days';
  return query
  select jsonb_build_object(
    'stickerId', s.id,
    'paymentId', s.payment_id,
    'itemKind', s.item_kind,
    'category', s.category,
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name,
    'amount', jsonb_build_object('minor', p.paid_minor, 'currency', p.paid_currency)
  )
  from public.stickers s
  join public.payments p on p.id = s.payment_id
  left join public.profiles pr on pr.id = p.payee_id
  where s.owner_id = uid and s.role = 'payer' and s.collected_at is null and s.earned_at > now() - interval '7 days'
  order by s.earned_at desc, s.id desc;
end;
$$;

create function public.collect_sticker(sticker uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stickers
  set collected_at = coalesce(collected_at, now())
  where id = collect_sticker.sticker and owner_id = (select auth.uid()) and role = 'payer';
  if not found then
    raise exception 'sticker_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('collected', true);
end;
$$;

revoke all on function public.sticker_book() from public, anon, authenticated;
revoke all on function public.settled_cards() from public, anon, authenticated;
revoke all on function public.collect_sticker(uuid) from public, anon, authenticated;
grant execute on function public.sticker_book() to authenticated;
grant execute on function public.settled_cards() to authenticated;
grant execute on function public.collect_sticker(uuid) to authenticated;

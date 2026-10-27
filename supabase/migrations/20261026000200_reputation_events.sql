create type public.reputation_event_kind as enum ('settled', 'no_show');

create table public.reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.reputation_event_kind not null,
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  counterpart_id uuid references auth.users (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  waived boolean not null default false,
  on_time boolean,
  created_at timestamptz not null default now(),
  check (kind = 'no_show' or not waived)
);

create unique index reputation_events_no_show_per_item on public.reputation_events (user_id, item_kind, item_id)
where kind = 'no_show';
create unique index reputation_events_settled_per_payment on public.reputation_events (user_id, payment_id)
where kind = 'settled';

create index reputation_events_user on public.reputation_events (user_id, kind, created_at);

alter table public.reputation_events enable row level security;

revoke all on public.reputation_events from anon, authenticated;

create function public.record_no_show(offender uuid, kind public.payment_item_kind, item uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored boolean;
  waiver boolean;
begin
  if offender is null or kind is null or item is null then
    raise exception 'invalid_no_show' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = offender) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  -- Serialises no-shows per offender so two concurrent cancels cannot both take the waiver.
  perform pg_advisory_xact_lock(hashtextextended('no_show:' || offender::text, 0));
  select waived into stored from public.reputation_events
  where user_id = offender and reputation_events.kind = 'no_show'
    and item_kind = record_no_show.kind and item_id = item;
  if found then
    return case when stored then 'waived' else 'counted' end;
  end if;
  waiver := not exists (
    select 1 from public.reputation_events
    where user_id = offender and reputation_events.kind = 'no_show' and waived
      and created_at > now() - interval '60 days'
  );
  insert into public.reputation_events (user_id, kind, item_kind, item_id, waived)
  values (offender, 'no_show', record_no_show.kind, item, waiver);
  return case when waiver then 'waived' else 'counted' end;
end;
$$;

revoke all on function public.record_no_show(uuid, public.payment_item_kind, uuid) from public, anon, authenticated;
grant execute on function public.record_no_show(uuid, public.payment_item_kind, uuid) to service_role;

create function private.record_settled(payment uuid) returns void
language sql
set search_path = ''
as $$
  insert into public.reputation_events (user_id, kind, item_kind, item_id, counterpart_id, payment_id, on_time)
  select side.user_id, 'settled', p.item_kind, p.item_id, side.counterpart_id, p.id, side.on_time
  from public.payments p
  cross join lateral (
    values
      (p.payee_id, p.payer_id, null::boolean),
      (p.payer_id, p.payee_id, p.marked_paid_at - p.created_at <= interval '72 hours')
  ) as side (user_id, counterpart_id, on_time)
  where p.id = payment and p.state = 'settled' and p.reverses is null and side.user_id is not null
  on conflict (user_id, payment_id) where kind = 'settled' do nothing;
$$;

revoke all on function private.record_settled(uuid) from public, anon, authenticated;

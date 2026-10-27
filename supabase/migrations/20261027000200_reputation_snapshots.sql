create type public.reputation_tier as enum ('new_friend', 'reliable', 'very_reliable', 'tapir_friend');

create table public.reputation_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier public.reputation_tier not null,
  settled_count integer not null,
  counterpart_count integer not null,
  counted_no_shows integer not null,
  completion_rate numeric(5, 4),
  on_time_share numeric(5, 4),
  computed_at timestamptz not null
);

alter table public.reputation_snapshots enable row level security;

revoke all on public.reputation_snapshots from anon, authenticated;
grant select (user_id, tier) on public.reputation_snapshots to authenticated;

create policy reputation_snapshots_select on public.reputation_snapshots
  for select to authenticated
  using (true);

create function private.tier_for(settled integer, counterparts integer, rate numeric, account_age interval)
returns public.reputation_tier
language sql
immutable
set search_path = ''
as $$
  select case
    when settled >= 12 and counterparts >= 8 and rate >= 0.95 and account_age >= interval '180 days'
      then 'tapir_friend'
    when settled >= 5 and counterparts >= 4 and rate >= 0.9 and account_age >= interval '60 days'
      then 'very_reliable'
    when settled >= 2 and counterparts >= 2 and rate >= 0.8
      then 'reliable'
    else 'new_friend'
  end::public.reputation_tier;
$$;

revoke all on function private.tier_for(integer, integer, numeric, interval) from public, anon, authenticated;

create function public.reputation_tier(uid uuid) returns public.reputation_tier
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.tier from public.reputation_snapshots s where s.user_id = uid),
    'new_friend'::public.reputation_tier
  );
$$;

revoke all on function public.reputation_tier(uuid) from public, anon, authenticated;
grant execute on function public.reputation_tier(uuid) to authenticated, service_role;

create function public.recompute_reputation(as_of timestamptz default now()) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  written integer;
begin
  insert into public.reputation_snapshots as s (
    user_id, tier, settled_count, counterpart_count, counted_no_shows, completion_rate, on_time_share, computed_at
  )
  select
    p.id,
    private.tier_for(t.settled, t.counterparts, t.rate, as_of - p.created_at),
    t.settled,
    t.counterparts,
    t.no_shows,
    t.rate,
    t.on_time,
    as_of
  from public.profiles p
  cross join lateral (
    select
      count(*) filter (where e.kind = 'settled')::integer as settled,
      -- Deleted counterparts (null ids) count together as one: deletions keep counting, but never as more than one.
      (
        count(distinct e.counterpart_id) filter (where e.kind = 'settled')
          + coalesce(bool_or(e.counterpart_id is null) filter (where e.kind = 'settled'), false)::integer
      )::integer as counterparts,
      count(*) filter (where e.kind = 'no_show' and not e.waived)::integer as no_shows,
      round(
        (count(*) filter (where e.kind = 'settled'))::numeric
          / nullif(count(*) filter (where e.kind = 'settled' or (e.kind = 'no_show' and not e.waived)), 0),
        4
      ) as rate,
      round(
        avg(case when e.on_time then 1 else 0 end) filter (where e.kind = 'settled' and e.on_time is not null),
        4
      ) as on_time
    from public.reputation_events e
    where e.user_id = p.id and e.created_at > as_of - interval '180 days' and e.created_at <= as_of
  ) t
  on conflict (user_id) do update set
    tier = excluded.tier,
    settled_count = excluded.settled_count,
    counterpart_count = excluded.counterpart_count,
    counted_no_shows = excluded.counted_no_shows,
    completion_rate = excluded.completion_rate,
    on_time_share = excluded.on_time_share,
    computed_at = excluded.computed_at;
  get diagnostics written = row_count;
  return written;
end;
$$;

revoke all on function public.recompute_reputation(timestamptz) from public, anon, authenticated;
grant execute on function public.recompute_reputation(timestamptz) to service_role;

-- pg_cron runs in UTC; 19:30 UTC is 03:30 Malaysia time.
select cron.schedule('reputation-recompute-daily', '30 19 * * *', $$select public.recompute_reputation()$$);

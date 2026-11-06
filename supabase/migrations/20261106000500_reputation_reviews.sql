alter table public.reputation_snapshots
  add column review_count integer not null default 0,
  add column good_review_share numeric(5, 4);

create function private.tier_thresholds() returns table (
  tier public.reputation_tier,
  settled integer,
  counterparts integer,
  rate numeric,
  account_age interval,
  good_share numeric
)
language sql
immutable
set search_path = ''
as $$
  values
    ('reliable'::public.reputation_tier, 2, 2, 0.8, interval '0', 0.7),
    ('very_reliable'::public.reputation_tier, 5, 4, 0.9, interval '60 days', 0.8),
    ('tapir_friend'::public.reputation_tier, 12, 8, 0.95, interval '180 days', 0.9);
$$;

revoke all on function private.tier_thresholds() from public, anon, authenticated;

-- The review share gates a tier only from 3 reviews in the window, so one early negative chip cannot sink a new user.
create function private.tier_for(
  settled integer,
  counterparts integer,
  rate numeric,
  account_age interval,
  reviews integer,
  good_share numeric
) returns public.reputation_tier
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(t.tier), 'new_friend'::public.reputation_tier)
  from private.tier_thresholds() t
  where tier_for.settled >= t.settled and tier_for.counterparts >= t.counterparts and tier_for.rate >= t.rate
    and tier_for.account_age >= t.account_age
    and (coalesce(tier_for.reviews, 0) < 3 or tier_for.good_share >= t.good_share);
$$;

revoke all on function private.tier_for(integer, integer, numeric, interval, integer, numeric)
  from public, anon, authenticated;

drop function private.tier_for(integer, integer, numeric, interval);

create table public.tier_drops (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_tier public.reputation_tier not null,
  to_tier public.reputation_tier not null,
  detail jsonb not null,
  dropped_at timestamptz not null,
  seen_at timestamptz,
  check (to_tier < from_tier)
);

create index tier_drops_unseen on public.tier_drops (user_id, id desc) where seen_at is null;

alter table public.tier_drops enable row level security;
revoke all on public.tier_drops from anon, authenticated;

create function private.item_title(kind public.payment_item_kind, item uuid) returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'bounty' then coalesce(
      (select b.title from public.bounties b where b.id = item),
      (
        select p.title from public.payments p
        where p.item_kind = 'bounty' and p.item_id = item and p.reverses is null
        order by p.created_at limit 1
      )
    )
    else (select private.ride_title(r) from public.rides r where r.id = item)
  end;
$$;

revoke all on function private.item_title(public.payment_item_kind, uuid) from public, anon, authenticated;

create function private.tier_drop_detail(
  uid uuid,
  regain public.reputation_tier,
  settled integer,
  counterparts integer,
  no_shows integer,
  reviews integer,
  good_share numeric,
  as_of timestamptz
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'noShows', coalesce((
      select jsonb_agg(jsonb_build_object('at', e.created_at, 'kind', e.item_kind, 'title', e.title) order by e.created_at desc)
      from (
        select x.created_at, x.item_kind, private.item_title(x.item_kind, x.item_id) as title
        from public.reputation_events x
        where x.user_id = uid and x.kind = 'no_show' and not x.waived and not x.appeal_pending
          and x.created_at > as_of - interval '180 days' and x.created_at <= as_of
        order by x.created_at desc
        limit 3
      ) e
    ), '[]'::jsonb),
    'noShowCount', no_shows,
    'negativeReviews', (
      select count(*) from public.reviews v
      where v.reviewee_id = uid and v.negative and v.shown_at > as_of - interval '180 days' and v.shown_at <= as_of
    ),
    'settled', tier_drop_detail.settled,
    'people', tier_drop_detail.counterparts,
    'toRegain', (
      select jsonb_build_object(
        'tier', t.tier,
        'settled', greatest(
          0,
          t.settled - tier_drop_detail.settled,
          ceil(t.rate * no_shows / (1 - t.rate) - 0.000001)::integer - tier_drop_detail.settled
        ),
        'newPeople', greatest(0, t.counterparts - tier_drop_detail.counterparts),
        'goodReviews', case
          when reviews >= 3 and tier_drop_detail.good_share < t.good_share then
            greatest(0, ceil(
              (t.good_share - tier_drop_detail.good_share) * reviews / (1 - t.good_share) - 0.000001
            )::integer)
          else 0
        end
      )
      from private.tier_thresholds() t where t.tier = regain
    )
  );
$$;

revoke all on function private.tier_drop_detail(
  uuid, public.reputation_tier, integer, integer, integer, integer, numeric, timestamptz
) from public, anon, authenticated;

create or replace function public.recompute_reputation(as_of timestamptz default now()) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  written integer;
begin
  with prev as (
    select s.user_id, s.tier from public.reputation_snapshots s
  ),
  up as (
    insert into public.reputation_snapshots as s (
      user_id, tier, settled_count, counterpart_count, counted_no_shows, completion_rate, on_time_share,
      review_count, good_review_share, computed_at
    )
    select
      p.id,
      private.tier_for(t.settled, t.counterparts, t.rate, as_of - p.created_at, rv.reviews, rv.good_share),
      t.settled,
      t.counterparts,
      t.no_shows,
      t.rate,
      t.on_time,
      rv.reviews,
      rv.good_share,
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
      where e.user_id = p.id and not e.appeal_pending
        and e.created_at > as_of - interval '180 days' and e.created_at <= as_of
    ) t
    cross join lateral (
      select
        count(*)::integer as reviews,
        round((count(*) filter (where not v.negative))::numeric / nullif(count(*), 0), 4) as good_share
      from public.reviews v
      where v.reviewee_id = p.id and v.shown_at > as_of - interval '180 days' and v.shown_at <= as_of
    ) rv
    on conflict (user_id) do update set
      tier = excluded.tier,
      settled_count = excluded.settled_count,
      counterpart_count = excluded.counterpart_count,
      counted_no_shows = excluded.counted_no_shows,
      completion_rate = excluded.completion_rate,
      on_time_share = excluded.on_time_share,
      review_count = excluded.review_count,
      good_review_share = excluded.good_review_share,
      computed_at = excluded.computed_at
    returning s.user_id, s.tier, s.settled_count, s.counterpart_count, s.counted_no_shows, s.review_count,
      s.good_review_share
  ),
  dropped as (
    insert into public.tier_drops (user_id, from_tier, to_tier, detail, dropped_at)
    select up.user_id, prev.tier, up.tier,
      private.tier_drop_detail(
        up.user_id, prev.tier, up.settled_count, up.counterpart_count, up.counted_no_shows, up.review_count,
        up.good_review_share, as_of
      ),
      as_of
    from up join prev on prev.user_id = up.user_id
    where up.tier < prev.tier
    returning 1
  )
  select count(*) into written from up;
  return written;
end;
$$;

create function public.pending_tier_drop() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'from', d.from_tier, 'to', d.to_tier, 'droppedAt', d.dropped_at, 'detail', d.detail
  )
  from public.tier_drops d
  where d.user_id = (select auth.uid()) and d.seen_at is null
    and d.to_tier = public.reputation_tier((select auth.uid()))
  order by d.id desc
  limit 1;
$$;

revoke all on function public.pending_tier_drop() from public, anon;
grant execute on function public.pending_tier_drop() to authenticated;

create function public.mark_tier_drop_seen(seen bigint) returns void
language sql
security definer
set search_path = ''
as $$
  update public.tier_drops d set seen_at = now()
  where d.user_id = (select auth.uid()) and d.id <= seen and d.seen_at is null;
$$;

revoke all on function public.mark_tier_drop_seen(bigint) from public, anon;
grant execute on function public.mark_tier_drop_seen(bigint) to authenticated;

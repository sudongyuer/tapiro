-- A ride's settled row without a payment comes only from record_ride_settled, so payment_id already marks the unpaid
-- rides; no flag or backfill. Tiers follow at the next 03:30 recompute.

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
        -- A ride without a Tapiro payment adds no people: it needs no proof it happened.
        (
          count(distinct e.counterpart_id) filter (where e.kind = 'settled' and e.counterpart_id <> e.user_id
            and (e.item_kind <> 'ride' or e.payment_id is not null))
            + coalesce(bool_or(e.counterpart_id is null) filter (where e.kind = 'settled'
              and (e.item_kind <> 'ride' or e.payment_id is not null)), false)::integer
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

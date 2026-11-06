create unique index reputation_events_settled_per_ride_pair on public.reputation_events (user_id, item_id, counterpart_id)
where kind = 'settled' and item_kind = 'ride' and payment_id is null;

-- Paid pairs already hold their rows from record_settled, so a ride counts the same with or without a payment. An
-- organiser who rode alone is their own counterpart: a null counterpart means a deleted account (recompute_reputation),
-- and riding alone must add no counted person. created_at is the close, so an old ride leaves the 180-day window on time.
create function private.record_ride_settled(ride uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides;
  riders uuid[];
begin
  select * into r from public.rides where id = ride;
  select coalesce(array_agg(m.member_id), '{}') into riders from public.ride_members m
  where m.ride_id = ride and m.status = 'boarded' and m.member_id is distinct from r.organiser_id;
  if cardinality(riders) > 0 then
    delete from public.reputation_events e
    where e.user_id = r.organiser_id and e.kind = 'settled' and e.item_kind = 'ride' and e.item_id = ride
      and e.counterpart_id = e.user_id;
  end if;
  insert into public.reputation_events (user_id, kind, item_kind, item_id, counterpart_id, created_at)
  select side.user_id, 'settled', 'ride', ride, side.counterpart_id, r.settled_at
  from (
    select r.organiser_id as user_id, rider as counterpart_id from unnest(riders) as rider
    union all
    select rider, r.organiser_id from unnest(riders) as rider
    union all
    select r.organiser_id, r.organiser_id where cardinality(riders) = 0
  ) side
  where side.user_id is not null
    and not exists (
      select 1 from public.reputation_events e
      where e.user_id = side.user_id and e.kind = 'settled' and e.item_kind = 'ride' and e.item_id = ride
        and (cardinality(riders) = 0 or e.counterpart_id is not distinct from side.counterpart_id)
    )
  on conflict (user_id, item_id, counterpart_id) where kind = 'settled' and item_kind = 'ride' and payment_id is null
  do nothing;
end;
$$;

revoke all on function private.record_ride_settled(uuid) from public, anon, authenticated;

create or replace function private.close_ride(ride uuid, actor uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = ride for update;
  update public.rides set status = 'closed', settled_at = now(), status_changed_at = now() where id = ride;
  perform private.log_ride(ride, 'settled', actor, from_status => r.status, to_status => 'closed');
  insert into public.stickers (owner_id, item_kind, item_id, role, title)
  select m.member_id, 'ride', ride,
    case when m.member_id = r.organiser_id then 'payee' else 'payer' end::public.sticker_role, private.ride_title(r)
  from public.ride_members m
  where m.ride_id = ride and m.status = 'boarded'
    and (r.status <> 'settling' or m.share_minor is not null)
    and exists (
      select 1 from public.ride_members o
      where o.ride_id = ride and o.status = 'boarded' and o.member_id is distinct from r.organiser_id
        and (r.status <> 'settling' or o.share_minor is not null)
    )
  on conflict (owner_id, item_id) where item_kind = 'ride' do nothing;
  perform private.record_ride_settled(ride);
end;
$$;

-- A confirmed appeal after the close boards the member into a ride that has already counted, split or not.
create function private.ride_appeal_settled() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.rides r where r.id = new.ride_id and r.status = 'closed') then
    perform private.record_ride_settled(new.ride_id);
  end if;
  return new;
end;
$$;

revoke all on function private.ride_appeal_settled() from public, anon, authenticated;

create trigger ride_appeal_settled
  after update of status on public.ride_members
  for each row
  when (old.status = 'appealed' and new.status = 'boarded')
  execute function private.ride_appeal_settled();

do $$
declare
  closed uuid;
begin
  for closed in select r.id from public.rides r where r.status = 'closed' order by r.settled_at loop
    perform private.record_ride_settled(closed);
  end loop;
end;
$$;

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
          count(distinct e.counterpart_id) filter (where e.kind = 'settled' and e.counterpart_id <> e.user_id)
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

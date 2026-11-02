alter type public.ride_event_kind add value 'appeal_lapsed' after 'appeal_confirmed';

-- A pending no-show keeps its created_at and waiver, so a lapsed appeal restores it exactly as recorded at 出发.
alter table public.reputation_events
  add column appeal_pending boolean not null default false,
  add constraint reputation_events_appeal_pending_no_show check (kind = 'no_show' or not appeal_pending);

insert into public.reputation_events (user_id, kind, item_kind, item_id, waived, appeal_pending, created_at)
select m.member_id, 'no_show', 'ride', m.ride_id, coalesce(e.note = 'waived', false), true, coalesce(e.created_at, now())
from public.ride_members m
left join lateral (
  select x.note, x.created_at from public.ride_events x
  where x.ride_id = m.ride_id and x.member_id = m.member_id and x.kind = 'no_show'
  order by x.id limit 1
) e on true
where m.status = 'appealed'
  and not exists (
    select 1 from public.reputation_events r
    where r.user_id = m.member_id and r.kind = 'no_show' and r.item_kind = 'ride' and r.item_id = m.ride_id
  );

create or replace function public.recompute_reputation(as_of timestamptz default now()) returns integer
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
    where e.user_id = p.id and not e.appeal_pending
      and e.created_at > as_of - interval '180 days' and e.created_at <= as_of
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

create or replace function public.appeal_ride_no_show(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members;
begin
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid for update;
  if mine.status = 'appealed' then
    return jsonb_build_object('status', 'appealed');
  end if;
  if mine.status is distinct from 'no_show' then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if not private.within_appeal_window(ride) then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.ride_members m set status = 'appealed' where m.ride_id = ride and m.member_id = uid;
  update public.reputation_events e set appeal_pending = true
  where e.user_id = uid and e.kind = 'no_show' and e.item_kind = 'ride' and e.item_id = ride;
  perform private.log_ride(ride, 'appealed', uid, uid);
  return jsonb_build_object('status', 'appealed');
end;
$$;

create or replace function public.confirm_ride_appeal(ride uuid, member uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  theirs public.ride_members;
begin
  if not private.is_ride_boarded(ride, uid) or uid = member then
    raise exception 'not_member' using errcode = '42501';
  end if;
  select * into theirs from public.ride_members m where m.ride_id = ride and m.member_id = member for update;
  if theirs.status = 'boarded' then
    return jsonb_build_object('status', 'boarded');
  end if;
  if theirs.status is distinct from 'appealed' or not private.within_appeal_window(ride) then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.ride_members m set status = 'boarded' where m.ride_id = ride and m.member_id = member;
  delete from public.reputation_events e
  where e.user_id = member and e.kind = 'no_show' and e.item_kind = 'ride' and e.item_id = ride;
  perform private.log_ride(ride, 'appeal_confirmed', uid, member);
  return jsonb_build_object('status', 'boarded');
end;
$$;

create function private.lapse_ride_appeal(ride uuid, member uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  waiver boolean;
  outcome text;
begin
  update public.ride_members m set status = 'no_show'
  where m.ride_id = ride and m.member_id = member and m.status = 'appealed';
  if not found then
    return null;
  end if;
  update public.reputation_events e set appeal_pending = false
  where e.user_id = member and e.kind = 'no_show' and e.item_kind = 'ride' and e.item_id = ride
  returning e.waived into waiver;
  outcome := case when waiver then 'waived' else 'counted' end;
  perform private.log_ride(ride, 'appeal_lapsed', null, member, note => outcome);
  return outcome;
end;
$$;

create or replace function private.run_ride_jobs(as_of timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  gathered integer := 0;
  expired integer := 0;
  lapsed integer := 0;
  skipped integer := 0;
begin
  for item in
    select id from public.rides
    where status in ('open', 'gathering') and coalesce(revised_at, depart_at) + interval '2 hours' <= as_of
    order by coalesce(revised_at, depart_at) for update skip locked
  loop
    begin
      perform private.expire_ride(item.id);
      expired := expired + 1;
    exception when others then
      skipped := skipped + 1;
      raise warning 'ride % not expired: % %', item.id, sqlstate, sqlerrm;
    end;
  end loop;

  for item in
    select id from public.rides
    where status = 'open' and coalesce(revised_at, depart_at) - interval '30 minutes' <= as_of
    order by coalesce(revised_at, depart_at) for update skip locked
  loop
    perform private.set_ride_status(item.id, 'gathering');
    perform private.log_ride(item.id, 'gathering', null, from_status => 'open', to_status => 'gathering');
    gathered := gathered + 1;
  end loop;

  -- Locks the member row, the one confirm_ride_appeal also locks, so a confirmation in flight is skipped, not overwritten.
  for item in
    select m.ride_id, m.member_id from public.ride_members m
    where m.status = 'appealed'
      and (
        select min(e.created_at) from public.ride_events e where e.ride_id = m.ride_id and e.kind = 'departed'
      ) <= as_of - interval '72 hours'
    order by m.ride_id, m.member_id for update of m skip locked
  loop
    begin
      if private.lapse_ride_appeal(item.ride_id, item.member_id) is not null then
        lapsed := lapsed + 1;
      end if;
    exception when others then
      skipped := skipped + 1;
      raise warning 'appeal on ride % by % not lapsed: % %', item.ride_id, item.member_id, sqlstate, sqlerrm;
    end;
  end loop;

  return jsonb_build_object('gathering', gathered, 'expired', expired, 'lapsed', lapsed, 'skipped', skipped);
end;
$$;

revoke all on function private.lapse_ride_appeal(uuid, uuid) from public, anon, authenticated;
revoke all on function private.run_ride_jobs(timestamptz) from public, anon, authenticated, service_role;

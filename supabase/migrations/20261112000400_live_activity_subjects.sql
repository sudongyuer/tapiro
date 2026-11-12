-- What the Lock Screen may show (274 A): the other person's display name and the place's short name, never an
-- address. A final step (到了, 出发了) stays listed for the 15 minutes the activity lingers (277 A).
create function public.live_activity_subjects() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  bounties as (
    select jsonb_build_object(
      'kind', 'bounty',
      'id', b.id,
      'phase', case when b.status = 'en_route' then 'onTheWay' else 'arrived' end,
      'helper', private.bounty_person_name(b.helper_id),
      'place', b.place_label,
      'task', b.title,
      'leftAt', (
        select max(e.created_at) from public.bounty_events e where e.bounty_id = b.id and e.kind = 'started'
      ),
      'etaAt', case when b.status = 'en_route' then b.eta_at end,
      'arrivedAt', case when b.status <> 'en_route' then b.done_at end
    ) as subject
    from public.bounties b, me
    where b.poster_id = me.uid
      and not private.is_blocked_between(me.uid, b.helper_id)
      and (
        (b.status = 'en_route' and b.eta_at is not null)
        or (
          b.status in ('done', 'disputed', 'confirmed')
          and b.done_at > now() - interval '15 minutes'
          and exists (select 1 from public.bounty_events e where e.bounty_id = b.id and e.kind = 'started')
        )
      )
  ),
  rides as (
    select r.id, r.start_short, r.start_kind, m.status as membership,
      private.ride_phase(r) as phase, private.ride_departs_at(r) as departs_at, (
        select min(e.created_at) from public.ride_events e where e.ride_id = r.id and e.kind = 'departed'
      ) as departed_at
    from public.ride_members m
    join public.rides r on r.id = m.ride_id
    cross join me
    where m.member_id = me.uid and m.status in ('accepted', 'boarded')
  ),
  ride_subjects as (
    select jsonb_build_object(
      'kind', 'ride',
      'id', r.id,
      'phase', case when r.departed_at is null then 'meetup' else 'departed' end,
      'startName', r.start_short,
      'startHome', r.start_kind is not distinct from 'home',
      'gatherAt', r.departs_at - interval '30 minutes',
      'departAt', r.departs_at,
      'arrived', (
        select count(*) from public.ride_members c
        where c.ride_id = r.id and c.status = 'accepted' and c.arrived_at is not null
      ),
      'total', (select count(*) from public.ride_members c where c.ride_id = r.id and c.status = 'accepted'),
      'departedAt', r.departed_at,
      'aboard', (select count(*) from public.ride_members c where c.ride_id = r.id and c.status = 'boarded')
    ) as subject
    from rides r
    where (r.departed_at is null and r.membership = 'accepted' and r.phase = 'gathering')
      or (r.membership = 'boarded' and r.departed_at > now() - interval '15 minutes')
  )
  select coalesce(jsonb_agg(subject), '[]'::jsonb)
  from (select subject from bounties union all select subject from ride_subjects) s;
$$;

revoke all on function public.live_activity_subjects() from public, anon;
grant execute on function public.live_activity_subjects() to authenticated;

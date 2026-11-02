create function private.ride_day(r public.rides) returns date
language sql
immutable
set search_path = ''
as $$
  select (private.ride_departs_at(r) at time zone 'Asia/Kuala_Lumpur')::date;
$$;

create function private.ride_summary(r public.rides, here extensions.geography, reference_currency text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'start', jsonb_build_object('label', r.start_label, 'short', r.start_short, 'kind', r.start_kind),
    'dest', jsonb_build_object('label', r.dest_label, 'short', r.dest_short, 'kind', r.dest_kind),
    'departAt', r.depart_at,
    'revisedAt', r.revised_at,
    'day', private.ride_day(r),
    'status', private.ride_phase(r),
    'seats', r.seats,
    'taken', (
      select count(*) from public.ride_members m
      where m.ride_id = r.id
        and m.status = any (case when r.status in ('open', 'gathering') then array['accepted']::public.ride_member_status[]
          else array['boarded']::public.ride_member_status[] end)
    ),
    'splitMode', r.split_mode,
    'estimate', case when r.estimate_minor is not null
      then jsonb_build_object('minor', r.estimate_minor, 'currency', r.currency) end,
    'reference', case when r.estimate_minor is not null
      then private.reference_money(r.estimate_minor, r.currency, reference_currency) end,
    'airport', r.dest_kind = 'airport' or r.flight_departs_at is not null,
    'flightDepartsAt', r.flight_departs_at,
    'largeBags', r.large_bags,
    'distanceM', private.rounded_distance(r.start_public, here),
    'point', jsonb_build_object(
      'latitude', extensions.st_y(r.start_public::extensions.geometry),
      'longitude', extensions.st_x(r.start_public::extensions.geometry)
    ),
    'settledAt', r.settled_at,
    'organiser', private.bounty_person(r.organiser_id)
  );
$$;

create function public.nearby_rides(
  latitude double precision default null,
  longitude double precision default null,
  page_after jsonb default null,
  page_size integer default 20,
  reference_currency text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set extra_float_digits = 3
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
  after_id uuid;
  after_day date;
  after_distance double precision;
  after_departs timestamptz;
  page uuid[];
  next_cursor jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if (latitude is null) <> (longitude is null)
    or latitude not between -90 and 90
    or longitude not between -180 and 180
    or page_size is null
    or page_size not between 1 and 50
    or (page_after is not null and jsonb_typeof(page_after) not in ('object', 'null'))
  then
    raise exception 'invalid_ride_query' using errcode = '22023';
  end if;
  if latitude is not null then
    here := extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography;
  end if;
  if jsonb_typeof(page_after) = 'object' then
    if exists (
      select 1 from jsonb_object_keys(page_after) as k where k not in ('id', 'latitude', 'longitude')
    ) then
      raise exception 'invalid_ride_query' using errcode = '22023';
    end if;
    begin
      after_id := (page_after ->> 'id')::uuid;
    exception when others then
      raise exception 'invalid_ride_query' using errcode = '22023';
    end;
    if after_id is null
      or (page_after -> 'latitude') is distinct from to_jsonb(latitude)
      or (page_after -> 'longitude') is distinct from to_jsonb(longitude)
    then
      raise exception 'ride_cursor_mismatch' using errcode = '22023';
    end if;
    select private.ride_day(r), coalesce(r.start_public operator(extensions.<->) here, 0), private.ride_departs_at(r)
    into after_day, after_distance, after_departs
    from public.rides r where r.id = after_id;
    if after_day is null then
      raise exception 'ride_cursor_mismatch' using errcode = '22023';
    end if;
  end if;

  select coalesce(array_agg(q.id order by q.day, q.distance, q.departs, q.id), '{}') into page
  from (
    select r.id, private.ride_day(r) as day,
      coalesce(r.start_public operator(extensions.<->) here, 0) as distance, private.ride_departs_at(r) as departs
    from public.rides r
    where r.status in ('open', 'gathering')
      and private.ride_departs_at(r) + interval '2 hours' > now()
      and r.organiser_id <> uid
      and not private.is_blocked_between(uid, r.organiser_id)
      and not exists (
        select 1 from public.ride_members m
        where m.ride_id = r.id and m.member_id = uid and m.status <> 'withdrawn'
      )
      and (
        after_id is null
        or (
          private.ride_day(r), coalesce(r.start_public operator(extensions.<->) here, 0), private.ride_departs_at(r), r.id
        ) > (after_day, after_distance, after_departs, after_id)
      )
    order by day, distance, departs, r.id
    limit page_size + 1
  ) q;

  if cardinality(page) > page_size then
    page := page[1:page_size];
    next_cursor := jsonb_build_object('id', page[page_size], 'latitude', latitude, 'longitude', longitude);
  end if;

  return jsonb_build_object(
    'items', (
      select coalesce(jsonb_agg(private.ride_summary(r, here, reference_currency) order by p.n), '[]'::jsonb)
      from unnest(page) with ordinality as p(id, n)
      join public.rides r on r.id = p.id
    ),
    'next', next_cursor
  );
end;
$$;

create function public.my_rides(reference_currency text default null) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select r, m.status as my_status, m.arrived_at, m.late_until
    from public.rides r
    join public.ride_members m on m.ride_id = r.id and m.member_id = (select auth.uid())
    where (
        m.status in ('accepted', 'boarded', 'no_show', 'appealed')
        or (m.status = 'requested' and private.ride_phase(r) in ('open', 'gathering'))
      )
      and (
        r.status in ('open', 'gathering', 'departed', 'arrived', 'settling')
        or (r.status = 'closed' and r.settled_at > now() - interval '24 hours')
        or (r.status in ('cancelled', 'expired') and r.status_changed_at > now() - interval '24 hours')
      )
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        private.ride_summary(mine.r, null, reference_currency) || jsonb_build_object(
          'role', case when (mine.r).organiser_id = (select auth.uid()) then 'organiser'
            when mine.my_status = 'requested' then 'applicant' else 'member' end,
          'myStatus', mine.my_status,
          'arrivedAt', mine.arrived_at,
          'lateUntil', mine.late_until,
          'pendingRequests', case when (mine.r).organiser_id = (select auth.uid()) then (
            select count(*) from public.ride_members q
            where q.ride_id = (mine.r).id and q.status = 'requested'
              and not private.is_blocked_between((mine.r).organiser_id, q.member_id)
          ) end
        )
        order by private.ride_departs_at(mine.r), (mine.r).id
      )
      from mine
    ), '[]'::jsonb),
    'historyCount', (
      select count(*) from public.rides r
      join public.ride_members m on m.ride_id = r.id and m.member_id = (select auth.uid()) and m.status = 'boarded'
      where r.status = 'closed' and r.settled_at <= now() - interval '24 hours'
    )
  );
$$;

create function public.ride_history(reference_currency text default null) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.ride_summary(h.r, null, reference_currency) order by (h.r).settled_at desc, (h.r).id), '[]'::jsonb)
  from (
    select r from public.rides r
    join public.ride_members m on m.ride_id = r.id and m.member_id = (select auth.uid()) and m.status = 'boarded'
    where r.status = 'closed' and r.settled_at <= now() - interval '24 hours'
    order by r.settled_at desc, r.id
    limit 100
  ) h;
$$;

revoke all on function private.ride_day(public.rides) from public, anon, authenticated;
revoke all on function private.ride_summary(public.rides, extensions.geography, text) from public, anon, authenticated;
revoke all on function public.nearby_rides(double precision, double precision, jsonb, integer, text)
  from public, anon, authenticated;
revoke all on function public.my_rides(text) from public, anon, authenticated;
revoke all on function public.ride_history(text) from public, anon, authenticated;
grant execute on function public.nearby_rides(double precision, double precision, jsonb, integer, text) to authenticated;
grant execute on function public.my_rides(text) to authenticated;
grant execute on function public.ride_history(text) to authenticated;

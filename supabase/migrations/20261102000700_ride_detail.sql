-- Mirrors rides_select, ride_members_select and ride_details_select, so the detail shows exactly what RLS would,
-- plus the viewer's own no-show row, which RLS hides once the member is no longer accepted or boarded.
create function private.ride_viewer_role(r public.rides, mine public.ride_members, uid uuid) returns text
language sql
stable
set search_path = ''
as $$
  select case
    when uid is null then null
    when r.organiser_id = uid then 'organiser'
    when mine.status in ('accepted', 'boarded') then 'member'
    when mine.status in ('no_show', 'appealed') then 'noShow'
    when private.is_blocked_between(uid, r.organiser_id) then null
    when private.ride_phase(r) not in ('open', 'gathering') then null
    when mine.status = 'requested' then 'applicant'
    else 'viewer'
  end;
$$;

create function private.ride_point(point extensions.geography) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'latitude', extensions.st_y(point::extensions.geometry),
    'longitude', extensions.st_x(point::extensions.geometry)
  );
$$;

create function private.ride_event_at(ride uuid, event public.ride_event_kind, member uuid default null)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select e.created_at from public.ride_events e
  where e.ride_id = ride and e.kind = event and (member is null or e.member_id = member)
  order by e.id desc
  limit 1;
$$;

create function private.ride_member_rows(r public.rides, uid uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    private.bounty_person(m.member_id) || jsonb_build_object(
      'status', m.status,
      'organiser', m.member_id = r.organiser_id,
      'arrivedAt', m.arrived_at,
      'lateUntil', m.late_until,
      'lateAt', case when m.late_until is not null then private.ride_event_at(r.id, 'late', m.member_id) end,
      'joinedAt', case when m.member_id = r.organiser_id then r.created_at
        else private.ride_event_at(r.id, 'approved', m.member_id) end
    )
    order by m.member_id = r.organiser_id desc, m.created_at, m.member_id
  ), '[]'::jsonb)
  from public.ride_members m
  where m.ride_id = r.id
    and m.status in ('accepted', 'boarded', 'no_show', 'appealed')
    and (r.organiser_id <> uid or m.member_id = uid or not private.is_blocked_between(uid, m.member_id));
$$;

create function private.ride_request_rows(r public.rides) returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    private.bounty_person(m.member_id) || jsonb_build_object('note', m.note, 'requestedAt', m.updated_at)
    order by m.updated_at, m.member_id
  ), '[]'::jsonb)
  from public.ride_members m
  where m.ride_id = r.id and m.status = 'requested'
    and not private.is_blocked_between(r.organiser_id, m.member_id);
$$;

create function public.ride_detail(ride uuid, reference_currency text default null) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides;
  mine public.ride_members;
  role text;
  inside boolean;
  departed timestamptz;
  full_at timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into r from public.rides where id = ride;
  if not found then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid;
  role := private.ride_viewer_role(r, mine, uid);
  if role is null then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  inside := role in ('organiser', 'member');
  departed := (
    select min(e.created_at) from public.ride_events e where e.ride_id = ride and e.kind = 'departed'
  );
  if private.ride_taken(ride) >= r.seats or departed is not null then
    full_at := private.ride_event_at(ride, 'approved');
  end if;
  return private.ride_summary(r, null, reference_currency) || jsonb_build_object(
    'role', role,
    'myStatus', mine.status,
    'myNote', case when role = 'applicant' then mine.note end,
    'arrivedAt', mine.arrived_at,
    'lateUntil', mine.late_until,
    'createdAt', r.created_at,
    'fullAt', full_at,
    'departedAt', departed,
    'reachedAt', private.ride_event_at(ride, 'reached'),
    'appealEndsAt', departed + interval '72 hours',
    'appealLapsed', role = 'noShow' and private.ride_event_at(ride, 'appeal_lapsed', uid) is not null,
    'noShow', case when role = 'noShow' then private.ride_no_show_outcome(ride, uid) end,
    'startPoint', case when inside then private.ride_point(r.start_point) else private.ride_point(r.start_public) end,
    'details', case when inside then coalesce((
      select jsonb_build_object('meetingNote', d.meeting_note, 'plate', d.plate, 'eta', d.eta)
      from public.ride_details d where d.ride_id = ride
    ), jsonb_build_object('meetingNote', null, 'plate', null, 'eta', null)) end,
    'members', case when inside then private.ride_member_rows(r, uid) end,
    'requests', case when role = 'organiser' then private.ride_request_rows(r) end
  );
end;
$$;

revoke all on function private.ride_viewer_role(public.rides, public.ride_members, uuid) from public, anon, authenticated;
revoke all on function private.ride_point(extensions.geography) from public, anon, authenticated;
revoke all on function private.ride_event_at(uuid, public.ride_event_kind, uuid) from public, anon, authenticated;
revoke all on function private.ride_member_rows(public.rides, uuid) from public, anon, authenticated;
revoke all on function private.ride_request_rows(public.rides) from public, anon, authenticated;
revoke all on function public.ride_detail(uuid, text) from public, anon, authenticated;
grant execute on function public.ride_detail(uuid, text) to authenticated;

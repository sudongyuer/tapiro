create function private.locked_ride(ride uuid) returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = ride for update;
  if not found then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  return r;
end;
$$;

create function private.locked_ride_as_organiser(ride uuid, uid uuid) returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides := private.locked_ride(ride);
begin
  if r.organiser_id is distinct from uid then
    raise exception 'not_organiser' using errcode = '42501';
  end if;
  return r;
end;
$$;

create function private.log_ride(
  ride uuid,
  kind public.ride_event_kind,
  actor uuid,
  member uuid default null,
  from_status public.ride_status default null,
  to_status public.ride_status default null,
  at_time timestamptz default null,
  minor bigint default null,
  note text default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ride_events (ride_id, kind, actor_id, member_id, from_status, to_status, at, minor, note)
  values (ride, kind, actor, member, from_status, to_status, at_time, minor, note);
$$;

create function private.set_ride_status(ride uuid, next public.ride_status) returns void
language sql
security definer
set search_path = ''
as $$
  update public.rides set status = next, status_changed_at = now() where id = ride;
$$;

create function private.ride_taken(ride uuid) returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.ride_members m where m.ride_id = ride and m.status = 'accepted';
$$;

-- Joining and leaving are only possible before 出发; every later phase answers as departed or closed.
create function private.require_before_departure(r public.rides) returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  phase public.ride_status := private.ride_phase(r);
begin
  if phase in ('cancelled', 'expired', 'closed') then
    raise exception 'closed' using errcode = '55000';
  end if;
  if phase not in ('open', 'gathering') then
    raise exception 'departed' using errcode = '55000';
  end if;
end;
$$;

create function private.in_no_show_window(r public.rides) returns boolean
language sql
stable
set search_path = ''
as $$
  select now() >= private.ride_departs_at(r) - interval '15 minutes';
$$;

create function private.waiver_available(uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.reputation_events
    where user_id = uid and kind = 'no_show' and waived and created_at > now() - interval '60 days'
  );
$$;

create function private.ride_no_show_outcome(ride uuid, uid uuid) returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when e.waived then 'waived' else 'counted' end
  from public.reputation_events e
  where e.user_id = uid and e.kind = 'no_show' and e.item_kind = 'ride' and e.item_id = ride;
$$;

create function public.publish_ride(
  id uuid,
  start_label text,
  start_short text,
  start_latitude double precision,
  start_longitude double precision,
  dest_label text,
  dest_short text,
  dest_latitude double precision,
  dest_longitude double precision,
  depart_at timestamptz,
  seats integer,
  currency text,
  split_mode public.ride_split_mode default 'tapiro',
  estimate_minor bigint default null,
  flight_departs_at timestamptz default null,
  large_bags integer default null,
  meeting_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  stored public.rides;
  from_label text := btrim(publish_ride.start_label);
  to_label text := btrim(publish_ride.dest_label);
  from_short text := btrim(publish_ride.start_short);
  to_short text := btrim(publish_ride.dest_short);
  note text := nullif(btrim(publish_ride.meeting_note), '');
  from_point extensions.geography := extensions.st_setsrid(
    extensions.st_makepoint(start_longitude, start_latitude), 4326
  )::extensions.geography;
  to_point extensions.geography := extensions.st_setsrid(
    extensions.st_makepoint(dest_longitude, dest_latitude), 4326
  )::extensions.geography;
  charged text;
begin
  if publish_ride.id is null then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  select * into stored from public.rides r where r.id = publish_ride.id;
  if found then
    if stored.organiser_id is distinct from uid then
      raise exception 'invalid_ride' using errcode = '22023';
    end if;
    if stored.start_label is distinct from from_label
      or stored.start_short is distinct from from_short
      or extensions.st_astext(stored.start_point) is distinct from extensions.st_astext(from_point)
      or stored.dest_label is distinct from to_label
      or stored.dest_short is distinct from to_short
      or extensions.st_astext(stored.dest_point) is distinct from extensions.st_astext(to_point)
      or stored.depart_at is distinct from publish_ride.depart_at
      or stored.seats is distinct from publish_ride.seats::smallint
      or stored.currency is distinct from publish_ride.currency::char(3)
      or stored.estimate_minor is distinct from publish_ride.estimate_minor
      or stored.flight_departs_at is distinct from publish_ride.flight_departs_at
      or stored.large_bags is distinct from publish_ride.large_bags::smallint
      or (select d.meeting_note from public.ride_details d where d.ride_id = stored.id) is distinct from note
    then
      raise exception 'post_already_sent' using errcode = '55000';
    end if;
    return jsonb_build_object(
      'id', stored.id,
      'status', stored.status,
      'charge', (select c.charge from public.post_charges c where c.item_kind = 'ride' and c.item_id = stored.id)
    );
  end if;
  if coalesce(char_length(from_label), 0) not between 1 and 80
    or coalesce(char_length(to_label), 0) not between 1 and 80
    or coalesce(char_length(from_short), 0) not between 1 and 8
    or coalesce(char_length(to_short), 0) not between 1 and 8
    or start_latitude is null or start_longitude is null or dest_latitude is null or dest_longitude is null
    or start_latitude not between -90 and 90 or dest_latitude not between -90 and 90
    or start_longitude not between -180 and 180 or dest_longitude not between -180 and 180
    or publish_ride.depart_at is null
    or publish_ride.depart_at <= now()
    or publish_ride.depart_at > now() + interval '30 days'
    or publish_ride.seats is null or publish_ride.seats not between 2 and 6
    or publish_ride.split_mode is null
    or publish_ride.large_bags not between 0 and 9
    or publish_ride.flight_departs_at <= publish_ride.depart_at
    or publish_ride.flight_departs_at > publish_ride.depart_at + interval '24 hours'
    or char_length(note) > 140
    or not exists (select 1 from public.currencies c where c.code = publish_ride.currency and c.enabled)
    or (
      publish_ride.estimate_minor is not null
      and not private.within_post_limits('ride', publish_ride.estimate_minor, publish_ride.currency)
    )
  then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  if public.publish_blocked() then
    raise exception 'publish_blocked' using errcode = '55000';
  end if;
  if not exists (select 1 from public.payee_methods where user_id = uid) then
    raise exception 'no_payee_method' using errcode = '55000';
  end if;
  insert into public.rides (
    id, organiser_id, start_point, start_label, start_short, start_kind, dest_point, dest_label, dest_short,
    dest_kind, depart_at, seats, currency, estimate_minor, split_mode, flight_departs_at, large_bags, status
  )
  values (
    publish_ride.id, uid, from_point, from_label, from_short, private.place_kind(from_label), to_point, to_label,
    to_short, private.place_kind(to_label), publish_ride.depart_at, publish_ride.seats, publish_ride.currency,
    publish_ride.estimate_minor, publish_ride.split_mode, publish_ride.flight_departs_at, publish_ride.large_bags,
    (case when publish_ride.depart_at - interval '30 minutes' <= now() then 'gathering' else 'open' end)::public.ride_status
  )
  returning * into stored;
  insert into public.ride_members (ride_id, member_id, status) values (stored.id, uid, 'accepted');
  if note is not null then
    insert into public.ride_details (ride_id, meeting_note) values (stored.id, note);
  end if;
  perform private.log_ride(stored.id, 'published', uid, to_status => stored.status);
  charged := public.spend_post(uid, 'ride', stored.id);
  return jsonb_build_object('id', stored.id, 'status', stored.status, 'charge', charged);
end;
$$;

create function public.request_ride(ride uuid, note text default null) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members;
  cleaned text := nullif(btrim(note), '');
begin
  if r.organiser_id = uid then
    raise exception 'own_ride' using errcode = '22023';
  end if;
  if exists (select 1 from public.blocks where blocker_id = uid and blocked_id = r.organiser_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  -- The blocked side is told the ride is closed so a block is not revealed to the person blocked.
  if exists (select 1 from public.blocks where blocker_id = r.organiser_id and blocked_id = uid) then
    raise exception 'closed' using errcode = '55000';
  end if;
  perform private.require_before_departure(r);
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid for update;
  if mine.status in ('requested', 'accepted') then
    return jsonb_build_object('status', mine.status, 'note', mine.note);
  end if;
  if mine.status is not null and mine.status <> 'withdrawn' then
    raise exception 'not_pending' using errcode = '55000';
  end if;
  if char_length(cleaned) > 140 then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  if private.ride_taken(ride) >= r.seats then
    raise exception 'full' using errcode = '55000';
  end if;
  if mine.status = 'withdrawn' then
    update public.ride_members m set status = 'requested', note = cleaned where m.ride_id = ride and m.member_id = uid;
  else
    insert into public.ride_members (ride_id, member_id, note) values (ride, uid, cleaned);
  end if;
  perform private.log_ride(ride, 'requested', uid, uid);
  return jsonb_build_object('status', 'requested', 'note', cleaned);
end;
$$;

create function public.withdraw_ride_request(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members;
begin
  select * into mine from public.ride_members m where m.ride_id = r.id and m.member_id = uid for update;
  if mine.status = 'withdrawn' then
    return jsonb_build_object('status', 'withdrawn');
  end if;
  if mine.status is distinct from 'requested' then
    raise exception 'not_pending' using errcode = '55000';
  end if;
  update public.ride_members m set status = 'withdrawn' where m.ride_id = r.id and m.member_id = uid;
  perform private.log_ride(r.id, 'withdrawn', uid, uid);
  return jsonb_build_object('status', 'withdrawn');
end;
$$;

create function public.decide_ride_request(ride uuid, member uuid, approve boolean) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  mine public.ride_members;
  decided public.ride_member_status := case when approve then 'accepted' else 'declined' end;
begin
  if approve is null then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = member for update;
  if mine.status = decided and member <> uid then
    return jsonb_build_object('status', decided, 'taken', private.ride_taken(ride), 'seats', r.seats);
  end if;
  -- A requester who blocked the organiser is answered like a withdrawn one so the block is not revealed.
  if mine.status is distinct from 'requested'
    or exists (select 1 from public.blocks where blocker_id = member and blocked_id = uid)
  then
    raise exception 'not_pending' using errcode = '55000';
  end if;
  if exists (select 1 from public.blocks where blocker_id = uid and blocked_id = member) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  perform private.require_before_departure(r);
  if approve and private.ride_taken(ride) >= r.seats then
    raise exception 'full' using errcode = '55000';
  end if;
  update public.ride_members m set status = decided where m.ride_id = ride and m.member_id = member;
  perform private.log_ride(
    ride, case when approve then 'approved' else 'declined' end::public.ride_event_kind, uid, member
  );
  return jsonb_build_object('status', decided, 'taken', private.ride_taken(ride), 'seats', r.seats);
end;
$$;

create function public.ride_leave_preview(ride uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides;
  counts boolean;
begin
  select * into r from public.rides where id = ride;
  if not found then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  if r.organiser_id = uid then
    raise exception 'own_ride' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.ride_members m where m.ride_id = ride and m.member_id = uid and m.status = 'accepted'
  ) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  perform private.require_before_departure(r);
  counts := private.in_no_show_window(r);
  return jsonb_build_object(
    'noShow', counts,
    'waiverAvailable', case when counts then private.waiver_available(uid) end
  );
end;
$$;

create function public.leave_ride(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members;
  outcome text;
begin
  if r.organiser_id = uid then
    raise exception 'own_ride' using errcode = '22023';
  end if;
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid for update;
  if mine.status = 'left' then
    return jsonb_build_object('status', 'left', 'noShow', private.ride_no_show_outcome(ride, uid));
  end if;
  if mine.status is distinct from 'accepted' then
    raise exception 'not_member' using errcode = '42501';
  end if;
  perform private.require_before_departure(r);
  if private.in_no_show_window(r) then
    outcome := public.record_no_show(uid, 'ride', ride);
  end if;
  update public.ride_members m set status = 'left', arrived_at = null, late_until = null
  where m.ride_id = ride and m.member_id = uid;
  perform private.log_ride(ride, 'left', uid, uid, note => outcome);
  return jsonb_build_object('status', 'left', 'noShow', outcome);
end;
$$;

create function public.ride_cancel_preview(ride uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides;
  members boolean;
  counts boolean;
begin
  select * into r from public.rides where id = ride;
  if not found then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  if r.organiser_id is distinct from uid then
    raise exception 'not_organiser' using errcode = '42501';
  end if;
  perform private.require_before_departure(r);
  members := private.ride_taken(ride) > 1;
  counts := members and private.in_no_show_window(r);
  return jsonb_build_object(
    'refund', not members,
    'noShow', counts,
    'waiverAvailable', case when counts then private.waiver_available(uid) end
  );
end;
$$;

create function public.cancel_ride(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  refunded text;
  outcome text;
begin
  if r.status = 'cancelled' then
    return jsonb_build_object(
      'status', 'cancelled',
      'refund', (
        select c.charge::text from public.post_charges c
        where c.item_kind = 'ride' and c.item_id = ride and c.refunded_at is not null
      ),
      'noShow', private.ride_no_show_outcome(ride, uid)
    );
  end if;
  perform private.require_before_departure(r);
  if private.ride_taken(ride) > 1 then
    if private.in_no_show_window(r) then
      outcome := public.record_no_show(uid, 'ride', ride);
    end if;
  else
    refunded := public.refund_post('ride', ride);
  end if;
  perform private.set_ride_status(ride, 'cancelled');
  perform private.log_ride(ride, 'cancelled', uid, from_status => r.status, to_status => 'cancelled', note => outcome);
  return jsonb_build_object('status', 'cancelled', 'refund', refunded, 'noShow', outcome);
end;
$$;

revoke all on function private.locked_ride(uuid) from public, anon, authenticated;
revoke all on function private.locked_ride_as_organiser(uuid, uuid) from public, anon, authenticated;
revoke all on function private.log_ride(
  uuid, public.ride_event_kind, uuid, uuid, public.ride_status, public.ride_status, timestamptz, bigint, text
) from public, anon, authenticated;
revoke all on function private.set_ride_status(uuid, public.ride_status) from public, anon, authenticated;
revoke all on function private.ride_taken(uuid) from public, anon, authenticated;
revoke all on function private.require_before_departure(public.rides) from public, anon, authenticated;
revoke all on function private.in_no_show_window(public.rides) from public, anon, authenticated;
revoke all on function private.waiver_available(uuid) from public, anon, authenticated;
revoke all on function private.ride_no_show_outcome(uuid, uuid) from public, anon, authenticated;

revoke all on function public.publish_ride(
  uuid, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz,
  integer, text, public.ride_split_mode, bigint, timestamptz, integer, text
) from public, anon, authenticated;
revoke all on function public.request_ride(uuid, text) from public, anon, authenticated;
revoke all on function public.withdraw_ride_request(uuid) from public, anon, authenticated;
revoke all on function public.decide_ride_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.ride_leave_preview(uuid) from public, anon, authenticated;
revoke all on function public.leave_ride(uuid) from public, anon, authenticated;
revoke all on function public.ride_cancel_preview(uuid) from public, anon, authenticated;
revoke all on function public.cancel_ride(uuid) from public, anon, authenticated;

grant execute on function public.publish_ride(
  uuid, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz,
  integer, text, public.ride_split_mode, bigint, timestamptz, integer, text
) to authenticated;
grant execute on function public.request_ride(uuid, text) to authenticated;
grant execute on function public.withdraw_ride_request(uuid) to authenticated;
grant execute on function public.decide_ride_request(uuid, uuid, boolean) to authenticated;
grant execute on function public.ride_leave_preview(uuid) to authenticated;
grant execute on function public.leave_ride(uuid) to authenticated;
grant execute on function public.ride_cancel_preview(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid) to authenticated;

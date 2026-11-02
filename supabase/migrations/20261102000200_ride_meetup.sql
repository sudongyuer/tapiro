create function private.locked_membership(ride uuid, uid uuid) returns public.ride_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  mine public.ride_members;
begin
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid for update;
  if mine.status is distinct from 'accepted' then
    raise exception 'not_member' using errcode = '42501';
  end if;
  return mine;
end;
$$;

create function public.mark_ride_arrived(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members := private.locked_membership(ride, uid);
begin
  perform private.require_before_departure(r);
  if private.ride_phase(r) <> 'gathering' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if mine.arrived_at is not null then
    return jsonb_build_object('arrivedAt', mine.arrived_at);
  end if;
  update public.ride_members m set arrived_at = now(), late_until = null
  where m.ride_id = ride and m.member_id = uid;
  perform private.log_ride(ride, 'arrived', uid, uid, at_time => now());
  return jsonb_build_object('arrivedAt', now());
end;
$$;

create function public.undo_ride_arrived(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members := private.locked_membership(ride, uid);
begin
  perform private.require_before_departure(r);
  if mine.arrived_at is null then
    return jsonb_build_object('arrivedAt', null);
  end if;
  update public.ride_members m set arrived_at = null where m.ride_id = ride and m.member_id = uid;
  perform private.log_ride(ride, 'arrival_undone', uid, uid, at_time => mine.arrived_at);
  return jsonb_build_object('arrivedAt', null);
end;
$$;

create function public.report_ride_late(ride uuid, minutes integer) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride(ride);
  mine public.ride_members := private.locked_membership(ride, uid);
  until timestamptz := now() + make_interval(mins => minutes);
begin
  if minutes is not null and minutes not in (5, 10, 15) then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  perform private.require_before_departure(r);
  if minutes is not null and mine.arrived_at is not null then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.ride_members m set late_until = until where m.ride_id = ride and m.member_id = uid;
  perform private.log_ride(ride, 'late', uid, uid, at_time => until, minor => minutes);
  return jsonb_build_object('lateUntil', until);
end;
$$;

create function public.revise_ride_time(ride uuid, departs timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  moved public.ride_status;
begin
  perform private.require_before_departure(r);
  if departs is null
    or departs <= now()
    or departs < private.ride_departs_at(r)
    or departs > r.depart_at + interval '24 hours'
  then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  if departs is distinct from private.ride_departs_at(r) then
    moved := case when departs - interval '30 minutes' <= now() then 'gathering' else 'open' end;
    update public.rides set revised_at = departs, status = moved, status_changed_at = case
      when moved <> r.status then now() else status_changed_at end
    where id = ride;
    perform private.log_ride(ride, 'time_revised', uid, from_status => r.status, to_status => moved, at_time => departs);
  end if;
  select * into r from public.rides where id = ride;
  return jsonb_build_object('departAt', r.depart_at, 'revisedAt', r.revised_at, 'status', r.status);
end;
$$;

create function public.update_ride_details(
  ride uuid,
  plate text default null,
  eta timestamptz default null,
  meeting_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  cleaned_plate text := nullif(btrim(update_ride_details.plate), '');
  cleaned_note text := nullif(btrim(update_ride_details.meeting_note), '');
begin
  if private.ride_phase(r) not in ('open', 'gathering', 'departed') then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if char_length(cleaned_plate) > 40
    or char_length(cleaned_note) > 140
    or update_ride_details.eta < now() - interval '1 hour'
    or update_ride_details.eta > now() + interval '2 days'
  then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  insert into public.ride_details as d (ride_id, meeting_note, plate, eta)
  values (ride, cleaned_note, cleaned_plate, update_ride_details.eta)
  on conflict (ride_id) do update
    set meeting_note = excluded.meeting_note, plate = excluded.plate, eta = excluded.eta
  where (d.meeting_note, d.plate, d.eta) is distinct from (excluded.meeting_note, excluded.plate, excluded.eta);
  if found then
    perform private.log_ride(ride, 'details_changed', uid, at_time => update_ride_details.eta);
  end if;
  return jsonb_build_object('plate', cleaned_plate, 'eta', update_ride_details.eta, 'meetingNote', cleaned_note);
end;
$$;

create function public.set_ride_split_mode(ride uuid, mode public.ride_split_mode) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
begin
  if mode is null then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  perform private.require_before_departure(r);
  if r.split_mode <> mode then
    update public.rides set split_mode = mode where id = ride;
    perform private.log_ride(ride, 'split_mode_changed', uid, note => mode::text);
  end if;
  return jsonb_build_object('splitMode', mode);
end;
$$;

create function private.ride_departure_answer(ride uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', 'departed',
    'boarded', (select count(*) from public.ride_members m where m.ride_id = ride and m.status = 'boarded'),
    'noShows', coalesce((
      select jsonb_agg(jsonb_build_object('memberId', e.member_id, 'noShow', e.note) order by e.id)
      from public.ride_events e where e.ride_id = ride and e.kind = 'no_show'
    ), '[]'::jsonb)
  );
$$;

create function public.depart_ride(ride uuid, boarded uuid[]) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  missing uuid;
  outcome text;
begin
  if r.status in ('departed', 'arrived', 'settling', 'closed') and exists (
    select 1 from public.ride_events e where e.ride_id = ride and e.kind = 'departed'
  ) then
    return private.ride_departure_answer(ride);
  end if;
  perform private.require_before_departure(r);
  if private.ride_phase(r) <> 'gathering' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if boarded is null or exists (
    select 1 from unnest(boarded) as b(id)
    where b.id = uid or not exists (
      select 1 from public.ride_members m where m.ride_id = ride and m.member_id = b.id and m.status = 'accepted'
    )
  ) then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  update public.ride_members m set status = 'boarded'
  where m.ride_id = ride and m.status = 'accepted' and (m.member_id = uid or m.member_id = any (boarded));
  perform private.set_ride_status(ride, 'departed');
  perform private.log_ride(ride, 'departed', uid, from_status => r.status, to_status => 'departed');
  for missing in
    select m.member_id from public.ride_members m
    where m.ride_id = ride and m.status = 'accepted'
    order by m.created_at, m.member_id
  loop
    outcome := public.record_no_show(missing, 'ride', ride);
    update public.ride_members m set status = 'no_show' where m.ride_id = ride and m.member_id = missing;
    perform private.log_ride(ride, 'no_show', uid, missing, note => outcome);
  end loop;
  return private.ride_departure_answer(ride);
end;
$$;

-- Counted from the actual 出发, not the ride status, so 到了 or the split cannot close the window early.
create function private.within_appeal_window(ride uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select min(e.created_at) > now() - interval '72 hours'
    from public.ride_events e where e.ride_id = ride and e.kind = 'departed'
  ), false);
$$;

revoke all on function private.within_appeal_window(uuid) from public, anon, authenticated;

-- While an appeal waits for a boarded member, the no-show is not counted, so its reputation row is removed.
create function public.appeal_ride_no_show(ride uuid) returns jsonb
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
  delete from public.reputation_events e
  where e.user_id = uid and e.kind = 'no_show' and e.item_kind = 'ride' and e.item_id = ride;
  perform private.log_ride(ride, 'appealed', uid, uid);
  return jsonb_build_object('status', 'appealed');
end;
$$;

create function public.confirm_ride_appeal(ride uuid, member uuid) returns jsonb
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
  perform private.log_ride(ride, 'appeal_confirmed', uid, member);
  return jsonb_build_object('status', 'boarded');
end;
$$;

revoke all on function private.locked_membership(uuid, uuid) from public, anon, authenticated;
revoke all on function private.ride_departure_answer(uuid) from public, anon, authenticated;
revoke all on function public.mark_ride_arrived(uuid) from public, anon, authenticated;
revoke all on function public.undo_ride_arrived(uuid) from public, anon, authenticated;
revoke all on function public.report_ride_late(uuid, integer) from public, anon, authenticated;
revoke all on function public.revise_ride_time(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.update_ride_details(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.set_ride_split_mode(uuid, public.ride_split_mode) from public, anon, authenticated;
revoke all on function public.depart_ride(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.appeal_ride_no_show(uuid) from public, anon, authenticated;
revoke all on function public.confirm_ride_appeal(uuid, uuid) from public, anon, authenticated;

grant execute on function public.mark_ride_arrived(uuid) to authenticated;
grant execute on function public.undo_ride_arrived(uuid) to authenticated;
grant execute on function public.report_ride_late(uuid, integer) to authenticated;
grant execute on function public.revise_ride_time(uuid, timestamptz) to authenticated;
grant execute on function public.update_ride_details(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.set_ride_split_mode(uuid, public.ride_split_mode) to authenticated;
grant execute on function public.depart_ride(uuid, uuid[]) to authenticated;
grant execute on function public.appeal_ride_no_show(uuid) to authenticated;
grant execute on function public.confirm_ride_appeal(uuid, uuid) to authenticated;

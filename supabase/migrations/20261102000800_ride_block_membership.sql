-- A block between the organiser and a member before 出发 ends the membership instead of hiding it: a hidden accepted
-- member was later recorded as a no-show by depart_ride without ever being shown on the boarding sheet. It is not a
-- leave, so no no-show and no 15-minute penalty apply. After 出发 a block changes nothing on the ride.
create function private.end_ride_memberships(a uuid, b uuid, actor uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ended integer := 0;
  row record;
begin
  for row in
    select m.ride_id, m.member_id, m.status
    from public.ride_members m
    join public.rides r on r.id = m.ride_id
    where m.status in ('accepted', 'requested')
      and private.ride_phase(r) in ('open', 'gathering')
      and ((r.organiser_id = a and m.member_id = b) or (r.organiser_id = b and m.member_id = a))
    order by m.ride_id
    for update of r, m
  loop
    update public.ride_members m
    set status = case when row.status = 'accepted' then 'left' else 'withdrawn' end::public.ride_member_status,
      arrived_at = null, late_until = null
    where m.ride_id = row.ride_id and m.member_id = row.member_id;
    perform private.log_ride(
      row.ride_id,
      case when row.status = 'accepted' then 'left' else 'withdrawn' end::public.ride_event_kind,
      actor, row.member_id, note => 'blocked'
    );
    ended := ended + 1;
  end loop;
  return ended;
end;
$$;

create function private.rides_after_block() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.end_ride_memberships(new.blocker_id, new.blocked_id, new.blocker_id);
  return new;
end;
$$;

create trigger blocks_end_ride_memberships
  after insert on public.blocks
  for each row execute function private.rides_after_block();

select private.end_ride_memberships(b.blocker_id, b.blocked_id, b.blocker_id) from public.blocks b;

-- After 出发 the organiser keeps every member row whatever the blocks, so boarding, appeals and the split stay correct.
create or replace function private.ride_member_rows(r public.rides, uid uuid) returns jsonb
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
  where m.ride_id = r.id and m.status in ('accepted', 'boarded', 'no_show', 'appealed');
$$;

revoke all on function private.end_ride_memberships(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.rides_after_block() from public, anon, authenticated;
revoke all on function private.ride_member_rows(public.rides, uuid) from public, anon, authenticated;

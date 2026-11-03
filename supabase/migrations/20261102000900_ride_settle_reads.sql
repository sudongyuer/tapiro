-- The share edit locks the payment before reading its state, so a 我已付款 that commits while the edit waits on the
-- payment row is seen, and a marked-paid amount is never changed.
create or replace function public.change_ride_share(ride uuid, member uuid, minor bigint) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  theirs public.ride_members;
  state public.payment_state;
  others bigint;
begin
  select * into theirs from public.ride_members m where m.ride_id = ride and m.member_id = member for update;
  if theirs.payment_id is not null then
    select p.state into state from public.payments p where p.id = theirs.payment_id for update;
  end if;
  if r.status <> 'settling' or theirs.payment_id is null or member = uid or state is distinct from 'due' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  select coalesce(sum(m.share_minor), 0) into others from public.ride_members m
  where m.ride_id = ride and m.status = 'boarded' and m.member_id not in (uid, member);
  if minor is null or minor <= 0 or others + minor > r.total_minor then
    raise exception 'invalid_split' using errcode = '22023';
  end if;
  if minor <> theirs.share_minor then
    perform public.set_payment_amount(theirs.payment_id, minor);
    update public.ride_members m set share_minor = change_ride_share.minor
    where m.ride_id = ride and m.member_id = member;
    update public.ride_members m set share_minor = r.total_minor - others - change_ride_share.minor
    where m.ride_id = ride and m.member_id = uid;
    perform private.log_ride(ride, 'share_changed', uid, member, minor => change_ride_share.minor);
  end if;
  return private.ride_split_answer(ride);
end;
$$;

-- A member whose appeal is confirmed after the split was sent boards without a share; the split stays as sent, so
-- the ride's last settlement gives them no car sticker.
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
end;
$$;

create function private.ride_paid(state public.payment_state) returns text
language sql
immutable
set search_path = ''
as $$
  select case state when 'settled' then 'settled' when 'marked_paid' then 'paid' else 'due' end;
$$;

create function private.ride_dispute(ride uuid, member uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('note', d.note, 'at', d.created_at)
  from public.ride_events d
  where d.ride_id = ride and d.kind = 'share_disputed' and d.member_id = member
    and d.id > coalesce((
      select max(c.id) from public.ride_events c
      where c.ride_id = ride and c.kind = 'share_changed' and c.member_id = member
    ), 0)
  order by d.id desc
  limit 1;
$$;

-- Every boarded member reads each rider's share and whether it is paid; the payment id, method, times, proof flag
-- and 「金额不对」 note go only to the organiser and to that rider.
create function private.ride_settle_view(r public.rides, uid uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when r.total_minor is not null then jsonb_build_object(
    'totalMinor', r.total_minor,
    'currency', r.currency,
    'organiserShare', (
      select m.share_minor from public.ride_members m where m.ride_id = r.id and m.member_id = r.organiser_id
    ),
    'sentAt', private.ride_event_at(r.id, 'split_sent'),
    'receipt', (select rr.proof_path from public.ride_receipts rr where rr.ride_id = r.id),
    'riders', coalesce((
      select jsonb_agg(
        private.bounty_person(m.member_id) || jsonb_build_object(
          'minor', m.share_minor,
          'paid', private.ride_paid(p.state)
        ) || case when uid = r.organiser_id or m.member_id = uid then jsonb_build_object(
          'paymentId', p.id,
          'methodType', p.method_type,
          'markedPaidAt', p.marked_paid_at,
          'settledAt', p.settled_at,
          'hasProof', p.proof_path is not null,
          'dueSince', p.created_at,
          'dispute', private.ride_dispute(r.id, m.member_id)
        ) else '{}'::jsonb end
        order by m.created_at, m.member_id
      )
      from public.ride_members m
      join public.payments p on p.id = m.payment_id
      where m.ride_id = r.id and m.status = 'boarded' and m.member_id <> r.organiser_id
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.ride_detail(ride uuid, reference_currency text default null) returns jsonb
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
  boarded boolean;
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
  boarded := role = 'organiser' or mine.status = 'boarded';
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
    'requests', case when role = 'organiser' then private.ride_request_rows(r) end,
    'currency', r.currency,
    'settle', case when boarded then private.ride_settle_view(r, uid) end,
    'myShare', case when boarded then mine.share_minor end,
    'sticker', (
      select jsonb_build_object('id', s.id, 'collected', s.collected_at is not null)
      from public.stickers s
      where s.owner_id = uid and s.item_kind = 'ride' and s.item_id = ride
    )
  );
end;
$$;

create or replace function public.my_rides(reference_currency text default null) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select r, m.status as my_status, m.arrived_at, m.late_until, m.share_minor, m.payment_id
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
          ) end,
          'currency', (mine.r).currency,
          'myShare', case when mine.my_status = 'boarded' and (mine.r).total_minor is not null then mine.share_minor end,
          'myPaid', (select private.ride_paid(p.state) from public.payments p where p.id = mine.payment_id)
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

-- A ride sticker has no payment: the rider's counterpart is the organiser; the organiser's is the earliest rider
-- who shared the fare.
create function private.ride_sticker_counterpart(s public.stickers) returns uuid
language sql
stable
set search_path = ''
as $$
  select case when s.role = 'payer' then r.organiser_id else (
    select m.member_id from public.ride_members m
    where m.ride_id = r.id and m.status = 'boarded' and m.member_id <> r.organiser_id
    order by m.share_minor is null, m.created_at, m.member_id
    limit 1
  ) end
  from public.rides r where r.id = s.item_id;
$$;

create or replace function public.sticker_book() returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'paymentId', s.payment_id,
    'role', s.role,
    'itemKind', s.item_kind,
    'category', s.category,
    'art', private.bounty_art(s.item_kind, p.item_id),
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name
  )
  from public.stickers s
  left join public.payments p on p.id = s.payment_id
  left join public.profiles pr on pr.id = case
    when s.item_kind = 'ride' then private.ride_sticker_counterpart(s)
    when s.role = 'payee' then p.payer_id
    else p.payee_id
  end
  where s.owner_id = (select auth.uid())
  order by s.earned_at desc, s.id desc;
$$;

-- A ride's settled card shows the rider's own share; a Grab-split ride has no payment, so it has no card and its
-- sticker is collected from the ride detail.
create or replace function public.settled_cards() returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  update public.stickers
  set collected_at = now()
  where owner_id = uid and role = 'payer' and collected_at is null and earned_at <= now() - interval '7 days';
  return query
  select jsonb_build_object(
    'stickerId', s.id,
    'paymentId', p.id,
    'itemKind', s.item_kind,
    'category', s.category,
    'art', private.bounty_art(s.item_kind, p.item_id),
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name,
    'amount', jsonb_build_object('minor', p.paid_minor, 'currency', p.paid_currency)
  )
  from public.stickers s
  join public.payments p on p.id = coalesce(s.payment_id, (
    select q.id from public.payments q
    where s.item_kind = 'ride' and q.item_kind = 'ride' and q.item_id = s.item_id and q.payer_id = uid
      and q.reverses is null and q.state = 'settled'
    order by q.created_at
    limit 1
  ))
  left join public.profiles pr on pr.id = p.payee_id
  where s.owner_id = uid and s.role = 'payer' and s.collected_at is null and s.earned_at > now() - interval '7 days'
  order by s.earned_at desc, s.id desc;
end;
$$;

revoke all on function private.ride_paid(public.payment_state) from public, anon, authenticated;
revoke all on function private.ride_dispute(uuid, uuid) from public, anon, authenticated;
revoke all on function private.ride_settle_view(public.rides, uuid) from public, anon, authenticated;
revoke all on function private.ride_sticker_counterpart(public.stickers) from public, anon, authenticated;

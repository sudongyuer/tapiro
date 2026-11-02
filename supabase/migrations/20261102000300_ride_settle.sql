do $$
declare
  existing integer;
begin
  select count(*) into existing from public.stickers where item_kind = 'ride';
  if existing > 0 then
    raise exception '% ride stickers exist before the per-ride sticker rule', existing using errcode = '23514';
  end if;
end;
$$;

alter table public.stickers alter column payment_id drop not null;
alter table public.stickers add column item_id uuid;
alter table public.stickers add constraint stickers_ride_item check ((item_kind = 'ride') = (item_id is not null));
alter table public.stickers add constraint stickers_ride_unpaid check ((item_kind = 'ride') = (payment_id is null));
create unique index stickers_one_per_ride on public.stickers (owner_id, item_id) where item_kind = 'ride';

create function private.ride_title(r public.rides) returns text
language sql
immutable
set search_path = ''
as $$
  select r.start_short || ' → ' || r.dest_short;
$$;

create function private.close_ride(ride uuid, actor uuid) returns void
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
  on conflict (owner_id, item_id) where item_kind = 'ride' do nothing;
end;
$$;

create function private.settle_ride_if_paid(ride uuid) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = ride for update;
  if not found or r.status <> 'settling' or exists (
    select 1 from public.payments p
    where p.item_kind = 'ride' and p.item_id = ride and p.reverses is null and p.state <> 'settled'
  ) then
    return false;
  end if;
  perform private.close_ride(ride, r.organiser_id);
  return true;
end;
$$;

create or replace function public.confirm_payment_received(payment uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  helped integer;
  total integer;
  ride_closed boolean := false;
begin
  if p.payee_id is distinct from (select auth.uid()) then
    raise exception 'only the payee confirms' using errcode = '42501';
  end if;
  if p.state = 'due' then
    if not exists (select 1 from public.payee_methods where user_id = p.payee_id and type = 'cash') then
      raise exception 'the payer has not marked it paid' using errcode = '55000';
    end if;
  elsif p.state <> 'marked_paid' then
    raise exception 'payment cannot be settled' using errcode = '55000';
  end if;
  update public.payments
  set state = 'settled', settled_at = now(), method_type = coalesce(method_type, 'cash')
  where id = p.id;
  perform public.log_payment_event(p.id, 'settled', p.payee_id);
  -- Serialises settles to one payee so concurrent settles return distinct counts and one first settle.
  perform pg_advisory_xact_lock(hashtextextended(p.payee_id::text, 0));
  if p.reverses is null and p.item_kind = 'ride' then
    perform private.record_settled(p.id);
    ride_closed := private.settle_ride_if_paid(p.item_id);
  elsif p.reverses is null then
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title)
    select side.owner_id, p.id, side.role, p.item_kind, p.category, p.title
    from (
      values (p.payee_id, 'payee'::public.sticker_role), (p.payer_id, 'payer'::public.sticker_role)
    ) as side (owner_id, role)
    where side.owner_id is not null
    on conflict (payment_id, owner_id) do nothing;
    perform private.record_settled(p.id);
    perform private.grant_help_settled(p.id);
  end if;
  select count(*) filter (where role = 'payee'), count(*) into helped, total
  from public.stickers where owner_id = p.payee_id;
  return jsonb_build_object(
    'state', 'settled',
    'firstSettled', p.reverses is null and helped = 1 and (p.item_kind <> 'ride' or ride_closed),
    'stickerCount', total
  ) || case when p.item_kind = 'ride' then jsonb_build_object('rideSettled', ride_closed) else '{}'::jsonb end;
end;
$$;

create or replace function public.award_missing_stickers() returns integer
language sql
security definer
set search_path = ''
as $$
  with awarded as (
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title, earned_at, collected_at)
    select side.owner_id, p.id, side.role, p.item_kind, p.category, p.title, p.settled_at,
      case when side.role = 'payer' then p.settled_at end
    from public.payments p
    cross join lateral (
      values (p.payee_id, 'payee'::public.sticker_role), (p.payer_id, 'payer'::public.sticker_role)
    ) as side (owner_id, role)
    where p.state = 'settled' and p.reverses is null and p.item_kind <> 'ride' and side.owner_id is not null
    on conflict (payment_id, owner_id) do nothing
    returning 1
  )
  select count(*)::integer from awarded;
$$;

create function private.valid_ride_receipt(ride uuid, receipt text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(receipt, '/', 1) = ride::text
    and exists (select 1 from storage.objects o where o.bucket_id = 'ride-receipts' and o.name = receipt);
$$;

create function private.store_ride_receipt(ride uuid, receipt text, actor uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if receipt is null then
    delete from public.ride_receipts where ride_id = ride;
  elsif not private.valid_ride_receipt(ride, receipt) then
    raise exception 'invalid_ride' using errcode = '22023';
  else
    insert into public.ride_receipts (ride_id, proof_path) values (ride, receipt)
    on conflict (ride_id) do update set proof_path = excluded.proof_path, created_at = now();
  end if;
  if found then
    perform private.log_ride(ride, 'receipt_set', actor, note => case when receipt is null then 'removed' end);
  end if;
end;
$$;

create function public.reach_ride(ride uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  riders integer;
begin
  if r.status in ('arrived', 'settling', 'closed') and exists (
    select 1 from public.ride_events e where e.ride_id = ride and e.kind = 'reached'
  ) then
    return jsonb_build_object('status', r.status);
  end if;
  if r.status <> 'departed' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  select count(*) into riders from public.ride_members m
  where m.ride_id = ride and m.status = 'boarded' and m.member_id <> uid;
  perform private.log_ride(ride, 'reached', uid, from_status => 'departed');
  if r.split_mode = 'grab' or riders = 0 then
    perform private.close_ride(ride, uid);
    return jsonb_build_object('status', 'closed');
  end if;
  perform private.set_ride_status(ride, 'arrived');
  return jsonb_build_object('status', 'arrived');
end;
$$;

create function private.ride_split_answer(ride uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', r.status,
    'totalMinor', r.total_minor,
    'currency', r.currency,
    'organiserShare', (
      select m.share_minor from public.ride_members m where m.ride_id = r.id and m.member_id = r.organiser_id
    ),
    'riders', coalesce((
      select jsonb_agg(jsonb_build_object('memberId', m.member_id, 'minor', m.share_minor, 'paymentId', m.payment_id)
        order by m.created_at, m.member_id)
      from public.ride_members m
      where m.ride_id = r.id and m.status = 'boarded' and m.member_id <> r.organiser_id
    ), '[]'::jsonb)
  )
  from public.rides r where r.id = ride;
$$;

create function public.send_ride_split(ride uuid, total_minor bigint, shares jsonb, receipt text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  wanted jsonb;
  item record;
  paid uuid;
  riders_sum bigint;
begin
  if jsonb_typeof(shares) is distinct from 'array' then
    raise exception 'invalid_split' using errcode = '22023';
  end if;
  begin
    select coalesce(jsonb_agg(jsonb_build_object('memberId', (s ->> 'memberId')::uuid, 'minor', (s ->> 'minor')::bigint)
      order by (s ->> 'memberId')::uuid), '[]'::jsonb)
    into wanted from jsonb_array_elements(shares) s;
  exception when others then
    raise exception 'invalid_split' using errcode = '22023';
  end;
  if r.status in ('settling', 'closed') and exists (
    select 1 from public.ride_events e where e.ride_id = ride and e.kind = 'split_sent'
  ) then
    if r.total_minor is distinct from send_ride_split.total_minor or wanted is distinct from (
      select coalesce(jsonb_agg(jsonb_build_object('memberId', m.member_id, 'minor', m.share_minor)
        order by m.member_id), '[]'::jsonb)
      from public.ride_members m
      where m.ride_id = ride and m.status = 'boarded' and m.member_id <> uid
    ) then
      raise exception 'invalid_transition' using errcode = '55000';
    end if;
    return private.ride_split_answer(ride);
  end if;
  if r.status <> 'arrived' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if not exists (select 1 from public.payee_methods where user_id = uid) then
    raise exception 'no_payee_method' using errcode = '55000';
  end if;
  select coalesce(sum((x ->> 'minor')::bigint), 0) into riders_sum from jsonb_array_elements(wanted) x;
  if send_ride_split.total_minor is null
    or not private.within_post_limits('ride', send_ride_split.total_minor, r.currency)
    or jsonb_array_length(wanted) = 0
    or exists (select 1 from jsonb_array_elements(wanted) x where (x ->> 'minor')::bigint is null or (x ->> 'minor')::bigint <= 0)
    or riders_sum > send_ride_split.total_minor
    or (select array_agg((x ->> 'memberId')::uuid order by (x ->> 'memberId')::uuid) from jsonb_array_elements(wanted) x)
      is distinct from (
        select array_agg(m.member_id order by m.member_id) from public.ride_members m
        where m.ride_id = ride and m.status = 'boarded' and m.member_id <> uid
      )
  then
    raise exception 'invalid_split' using errcode = '22023';
  end if;
  if receipt is not null then
    perform private.store_ride_receipt(ride, receipt, uid);
  end if;
  update public.rides set total_minor = send_ride_split.total_minor, status = 'settling', status_changed_at = now()
  where id = ride;
  update public.ride_members m set share_minor = send_ride_split.total_minor - riders_sum
  where m.ride_id = ride and m.member_id = uid;
  for item in select (x ->> 'memberId')::uuid as member, (x ->> 'minor')::bigint as minor from jsonb_array_elements(wanted) x
  loop
    paid := public.open_payment('ride', ride, private.ride_title(r), item.member, uid, item.minor, r.currency);
    update public.ride_members m set share_minor = item.minor, payment_id = paid
    where m.ride_id = ride and m.member_id = item.member;
  end loop;
  perform private.log_ride(
    ride, 'split_sent', uid, from_status => 'arrived', to_status => 'settling', minor => send_ride_split.total_minor
  );
  return private.ride_split_answer(ride);
end;
$$;

create function public.set_ride_receipt(ride uuid, receipt text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
begin
  if r.status not in ('arrived', 'settling') then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  perform private.store_ride_receipt(ride, receipt, uid);
  return jsonb_build_object('receipt', receipt);
end;
$$;

create function public.dispute_ride_share(ride uuid, note text default null) returns jsonb
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
  select * into mine from public.ride_members m where m.ride_id = ride and m.member_id = uid;
  if mine.payment_id is null or uid = r.organiser_id then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if r.status <> 'settling'
    or (select p.state from public.payments p where p.id = mine.payment_id) = 'settled'
  then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if char_length(cleaned) > 140 then
    raise exception 'invalid_ride' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.ride_events e
    where e.ride_id = ride and e.kind = 'share_disputed' and e.member_id = uid and e.note is not distinct from cleaned
      and e.id > coalesce((
        select max(c.id) from public.ride_events c where c.ride_id = ride and c.kind = 'share_changed' and c.member_id = uid
      ), 0)
  ) then
    perform private.log_ride(ride, 'share_disputed', uid, uid, minor => mine.share_minor, note => cleaned);
  end if;
  return jsonb_build_object('disputed', true, 'note', cleaned);
end;
$$;

create function public.change_ride_share(ride uuid, member uuid, minor bigint) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides := private.locked_ride_as_organiser(ride, uid);
  theirs public.ride_members;
  others bigint;
begin
  select * into theirs from public.ride_members m where m.ride_id = ride and m.member_id = member for update;
  if r.status <> 'settling' or theirs.payment_id is null or member = uid
    or (select p.state from public.payments p where p.id = theirs.payment_id) <> 'due'
  then
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

create function public.ride_paid_states(ride uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rides;
begin
  select * into r from public.rides where id = ride;
  if not found then
    raise exception 'ride_not_found' using errcode = 'P0002';
  end if;
  if not private.is_ride_boarded(ride, uid) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  return private.ride_split_answer(ride) || jsonb_build_object(
    'hasReceipt', exists (select 1 from public.ride_receipts rr where rr.ride_id = ride),
    'riders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'memberId', m.member_id,
        'name', (select pr.display_name from public.profiles pr where pr.id = m.member_id),
        'minor', m.share_minor,
        'state', p.state,
        'methodType', case when p.state = 'settled' then p.method_type end,
        'settledAt', p.settled_at
      ) order by m.created_at, m.member_id)
      from public.ride_members m
      left join public.payments p on p.id = m.payment_id
      where m.ride_id = ride and m.status = 'boarded' and m.member_id <> r.organiser_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.ride_title(public.rides) from public, anon, authenticated;
revoke all on function private.close_ride(uuid, uuid) from public, anon, authenticated;
revoke all on function private.settle_ride_if_paid(uuid) from public, anon, authenticated;
revoke all on function private.valid_ride_receipt(uuid, text) from public, anon, authenticated;
revoke all on function private.store_ride_receipt(uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.ride_split_answer(uuid) from public, anon, authenticated;
revoke all on function public.reach_ride(uuid) from public, anon, authenticated;
revoke all on function public.send_ride_split(uuid, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.set_ride_receipt(uuid, text) from public, anon, authenticated;
revoke all on function public.dispute_ride_share(uuid, text) from public, anon, authenticated;
revoke all on function public.change_ride_share(uuid, uuid, bigint) from public, anon, authenticated;
revoke all on function public.ride_paid_states(uuid) from public, anon, authenticated;

grant execute on function public.reach_ride(uuid) to authenticated;
grant execute on function public.send_ride_split(uuid, bigint, jsonb, text) to authenticated;
grant execute on function public.set_ride_receipt(uuid, text) to authenticated;
grant execute on function public.dispute_ride_share(uuid, text) to authenticated;
grant execute on function public.change_ride_share(uuid, uuid, bigint) to authenticated;
grant execute on function public.ride_paid_states(uuid) to authenticated;

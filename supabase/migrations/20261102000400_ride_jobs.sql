create function private.expire_ride(ride uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides := private.locked_ride(ride);
  refunded text;
begin
  if r.status not in ('open', 'gathering') then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if private.ride_taken(ride) <= 1 then
    refunded := public.refund_post('ride', ride);
  end if;
  perform private.set_ride_status(ride, 'expired');
  perform private.log_ride(ride, 'expired', null, from_status => r.status, to_status => 'expired', note => refunded);
  return refunded;
end;
$$;

create function private.run_ride_jobs(as_of timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  gathered integer := 0;
  expired integer := 0;
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

  return jsonb_build_object('gathering', gathered, 'expired', expired, 'skipped', skipped);
end;
$$;

create function public.run_ride_jobs() returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.run_ride_jobs(now());
$$;

create function public.ride_receipts_to_delete(grace interval default interval '3 hours')
returns table (object_name text, ride_id uuid, clears_receipt boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, r.id, o.name = rr.proof_path
  from storage.objects o
  join public.rides r on r.id::text = split_part(o.name, '/', 1)
  left join public.ride_receipts rr on rr.ride_id = r.id
  where o.bucket_id = 'ride-receipts'
    and (
      (r.status = 'closed' and r.settled_at <= now() - interval '30 days')
      or (o.name is distinct from rr.proof_path and o.created_at <= now() - grace)
    )
  union all
  select o.name, null, false
  from storage.objects o
  where o.bucket_id = 'ride-receipts'
    and o.created_at <= now() - grace
    and not exists (select 1 from public.rides r where r.id::text = split_part(o.name, '/', 1));
$$;

create function public.clear_ride_receipt(ride uuid) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ride_receipts rr
  using public.rides r
  where rr.ride_id = ride and r.id = ride and r.status = 'closed';
$$;

create function public.active_rides_of(uid uuid) returns table (
  id uuid,
  title text,
  role text,
  status public.ride_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.start_short || ' → ' || r.dest_short,
    case when r.organiser_id = uid then 'organiser' else 'rider' end, r.status
  from public.rides r
  where r.status in ('open', 'gathering', 'departed', 'arrived', 'settling')
    and (
      (
        r.organiser_id = uid
        and (
          r.status not in ('open', 'gathering')
          or exists (
            select 1 from public.ride_members m
            where m.ride_id = r.id and m.member_id <> uid and m.status = 'accepted'
          )
        )
      )
      or exists (
        select 1 from public.ride_members m
        where m.ride_id = r.id and m.member_id = uid and r.organiser_id is distinct from uid
          and m.status in ('accepted', 'boarded')
      )
    )
  order by r.status_changed_at, r.id;
$$;

create function private.rides_before_user_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item uuid;
begin
  if exists (select 1 from public.active_rides_of(old.id)) then
    raise exception 'active_rides' using errcode = '55000';
  end if;
  for item in
    select r.id from public.rides r
    where r.organiser_id = old.id and r.status in ('open', 'gathering')
    order by r.id
  loop
    perform public.refund_post('ride', item);
    perform private.set_ride_status(item, 'cancelled');
    perform private.log_ride(item, 'cancelled', old.id, to_status => 'cancelled', note => 'account_deleted');
  end loop;
  for item in
    select m.ride_id from public.ride_members m
    where m.member_id = old.id and m.status = 'requested'
    order by m.ride_id
  loop
    update public.ride_members m set status = 'withdrawn' where m.ride_id = item and m.member_id = old.id;
    perform private.log_ride(item, 'withdrawn', old.id, old.id, note => 'account_deleted');
  end loop;
  delete from public.ride_details d
  using public.rides r
  where r.id = d.ride_id and r.organiser_id = old.id;
  return old;
end;
$$;

create trigger rides_before_user_delete
  before delete on auth.users
  for each row execute function private.rides_before_user_delete();

revoke all on function private.expire_ride(uuid) from public, anon, authenticated;
revoke all on function private.run_ride_jobs(timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.run_ride_jobs() from public, anon, authenticated;
revoke all on function public.ride_receipts_to_delete(interval) from public, anon, authenticated;
revoke all on function public.clear_ride_receipt(uuid) from public, anon, authenticated;
revoke all on function public.active_rides_of(uuid) from public, anon, authenticated;
revoke all on function private.rides_before_user_delete() from public, anon, authenticated;
grant execute on function public.run_ride_jobs() to service_role;
grant execute on function public.ride_receipts_to_delete(interval) to service_role;
grant execute on function public.clear_ride_receipt(uuid) to service_role;
grant execute on function public.active_rides_of(uuid) to service_role;

select cron.schedule('ride-jobs', '* * * * *', $$select public.run_ride_jobs()$$);

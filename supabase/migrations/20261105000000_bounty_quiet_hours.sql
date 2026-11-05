create function private.on_active_bounty(recipient uuid, bounty uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bounties b
    where b.id = bounty and recipient in (b.poster_id, b.helper_id)
      and (
        b.status in ('en_route', 'done')
        or (
          b.status in ('cancelled', 'disputed')
          and (
            select e.from_status from public.bounty_events e where e.bounty_id = b.id order by e.id desc limit 1
          ) in ('en_route', 'done')
        )
      )
  );
$$;

-- Quiet hours skip the ride and the bounty the recipient is on. A bounty counts while it is en_route or done and
-- for the transition that ends that stretch (a cancel on the way, a problem reported after 完成), so news that
-- the job stopped is not held until 08:00 either.
create or replace function private.queue_push() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread text;
  on_item boolean := false;
  held timestamptz := private.quiet_until(new.created_at);
begin
  if new.kind like 'ride.%' then
    thread := 'ride:' || new.subject_id;
    on_item := exists (
      select 1 from public.rides r where r.id = new.subject_id and r.status in ('gathering', 'departed')
    );
  elsif new.kind like 'bounty.%' then
    thread := 'bounty:' || new.subject_id;
    on_item := private.on_active_bounty(new.recipient, new.subject_id);
  elsif new.kind like 'payment.%' then
    select p.item_kind::text || ':' || p.item_id into thread from public.payments p where p.id = new.subject_id;
    thread := coalesce(thread, 'payment:' || new.subject_id);
  elsif new.kind like 'chat.%' then
    thread := 'chat:' || new.subject_id;
    on_item := exists (
      select 1 from public.threads t
      left join public.rides r on r.id = t.ride_id
      left join public.bounties b on b.id = t.bounty_id
      where t.id = new.subject_id
        and (r.status in ('gathering', 'departed') or b.status in ('en_route', 'done'))
    );
  else
    raise warning 'push for % not queued: no thread rule', new.kind;
    return new;
  end if;
  insert into public.push_queue (event_id, recipient, kind, subject_id, thread_id, quiet, send_at)
  values (
    new.id, new.recipient, new.kind, new.subject_id, thread,
    held is not null and not on_item,
    case when held is not null and not on_item then held else new.created_at end
  );
  return new;
end;
$$;

revoke all on function private.on_active_bounty(uuid, uuid) from public, anon, authenticated;

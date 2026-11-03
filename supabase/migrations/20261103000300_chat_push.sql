insert into private.event_kinds (kind, push) values ('chat.message', true);

-- A chat push in a ride group that is gathering or departed skips quiet hours, like the ride's own pushes.
create or replace function private.queue_push() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread text;
  on_ride boolean := false;
  held timestamptz := private.quiet_until(new.created_at);
begin
  if new.kind like 'ride.%' then
    thread := 'ride:' || new.subject_id;
    on_ride := exists (
      select 1 from public.rides r where r.id = new.subject_id and r.status in ('gathering', 'departed')
    );
  elsif new.kind like 'bounty.%' then
    thread := 'bounty:' || new.subject_id;
  elsif new.kind like 'payment.%' then
    select p.item_kind::text || ':' || p.item_id into thread from public.payments p where p.id = new.subject_id;
    thread := coalesce(thread, 'payment:' || new.subject_id);
  elsif new.kind like 'chat.%' then
    thread := 'chat:' || new.subject_id;
    on_ride := exists (
      select 1 from public.threads t join public.rides r on r.id = t.ride_id
      where t.id = new.subject_id and r.status in ('gathering', 'departed')
    );
  else
    raise warning 'push for % not queued: no thread rule', new.kind;
    return new;
  end if;
  insert into public.push_queue (event_id, recipient, kind, subject_id, thread_id, quiet, send_at)
  values (
    new.id, new.recipient, new.kind, new.subject_id, thread,
    held is not null and not on_ride,
    case when held is not null and not on_ride then held else new.created_at end
  );
  return new;
end;
$$;

create or replace function private.push_subject(kind text, subject uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind like 'bounty.%' then (select jsonb_build_object('title', b.title) from public.bounties b where b.id = subject)
    when kind like 'ride.%' then (
      select jsonb_build_object('from', r.start_short, 'to', r.dest_short) from public.rides r where r.id = subject
    )
    when kind like 'payment.%' then (
      select jsonb_build_object('title', p.title) from public.payments p where p.id = subject
    )
    when kind like 'chat.%' then (
      select case
        when t.bounty_id is not null then jsonb_build_object('title', b.title)
        else jsonb_build_object('from', r.start_short, 'to', r.dest_short)
      end
      from public.threads t
      left join public.bounties b on b.id = t.bounty_id
      left join public.rides r on r.id = t.ride_id
      where t.id = subject
    )
  end;
$$;

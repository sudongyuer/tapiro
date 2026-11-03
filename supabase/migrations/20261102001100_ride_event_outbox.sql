create table private.event_kinds (
  kind text primary key check (kind ~ '^[a-z]+\.[a-z_]+$'),
  push boolean not null
);

insert into private.event_kinds (kind, push)
values
  ('ride.requested', true),
  ('ride.withdrawn', false),
  ('ride.approved', true),
  ('ride.declined', true),
  ('ride.left', false),
  ('ride.cancelled', true),
  ('ride.gathering', false),
  ('ride.expired', false),
  ('ride.arrival', false),
  ('ride.time_revised', true),
  ('ride.details_changed', false),
  ('ride.split_mode_changed', false),
  ('ride.departed', false),
  ('ride.no_show', true),
  ('ride.appealed', true),
  ('ride.appeal_confirmed', false),
  ('ride.appeal_lapsed', false),
  ('ride.reached', false),
  ('ride.split_sent', true),
  ('ride.receipt_set', false),
  ('ride.share_disputed', true),
  ('ride.share_changed', true),
  ('ride.settled', false),
  ('payment.marked_paid', true),
  ('payment.not_received', true),
  ('payment.settled', false);

create table public.events (
  id bigint generated always as identity primary key,
  recipient uuid not null references auth.users (id) on delete cascade,
  kind text not null references private.event_kinds (kind),
  subject_id uuid not null,
  push boolean not null,
  push_error text,
  created_at timestamptz not null default now()
);

create index events_recipient on public.events (recipient, created_at);
create index events_created on public.events (created_at);

create table public.push_recordings (
  id bigint generated always as identity primary key,
  event_id bigint not null unique references public.events (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  subject_id uuid not null,
  thread_id text not null,
  quiet boolean not null,
  send_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.push_recordings enable row level security;
revoke all on public.events, public.push_recordings from public, anon, authenticated;

create function private.quiet_until(at_time timestamptz) returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when extract(hour from at_time at time zone 'Asia/Kuala_Lumpur') >= 23
      then (date_trunc('day', at_time at time zone 'Asia/Kuala_Lumpur') + interval '1 day 8 hours')
        at time zone 'Asia/Kuala_Lumpur'
    when extract(hour from at_time at time zone 'Asia/Kuala_Lumpur') < 8
      then (date_trunc('day', at_time at time zone 'Asia/Kuala_Lumpur') + interval '8 hours')
        at time zone 'Asia/Kuala_Lumpur'
  end;
$$;

-- The realtime spec's RecordingSender, kept in the database until the account half builds `notify`: quiet hours
-- (170 A) hold a push until 08:00 Malaysia time, except for the ride the recipient is on right now.
create function private.record_push() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_id uuid;
  on_ride boolean := false;
  held timestamptz := private.quiet_until(new.created_at);
begin
  if new.kind like 'ride.%' then
    ride_id := new.subject_id;
    on_ride := exists (
      select 1 from public.rides r where r.id = ride_id and r.status in ('gathering', 'departed')
    );
  else
    select p.item_id into ride_id from public.payments p where p.id = new.subject_id;
  end if;
  insert into public.push_recordings (event_id, recipient, kind, subject_id, thread_id, quiet, send_at)
  values (
    new.id, new.recipient, new.kind, new.subject_id, 'ride:' || coalesce(ride_id, new.subject_id),
    held is not null and not on_ride,
    case when held is not null and not on_ride then held else new.created_at end
  );
  return new;
end;
$$;

create trigger events_record_push
  after insert on public.events
  for each row when (new.push) execute function private.record_push();

create function private.emit_event(recipients uuid[], kind text, subject uuid, actor uuid) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.events (recipient, kind, subject_id, push)
  select distinct person, k.kind, subject, k.push
  from unnest(recipients) person
  join private.event_kinds k on k.kind = emit_event.kind
  where person is not null and person is distinct from actor;
$$;

create function private.ride_people(ride uuid, statuses public.ride_member_status[]) returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.member_id), '{}') from public.ride_members m
  where m.ride_id = ride and m.status = any (statuses);
$$;

create function private.ride_event_fanout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organiser uuid := (select r.organiser_id from public.rides r where r.id = new.ride_id);
  crew uuid[] := private.ride_people(new.ride_id, '{accepted,boarded}');
  boarded uuid[] := private.ride_people(new.ride_id, '{boarded}');
  recipients uuid[];
  kind text := 'ride.' || new.kind::text;
begin
  if new.note in ('blocked', 'account_deleted') and new.kind in ('left', 'withdrawn') then
    return new;
  end if;
  recipients := case new.kind
    when 'published' then '{}'
    when 'requested' then array[organiser]
    when 'withdrawn' then array[organiser]
    when 'left' then array[organiser]
    when 'approved' then array[new.member_id]
    when 'declined' then array[new.member_id]
    when 'cancelled' then private.ride_people(new.ride_id, '{accepted,requested}')
    when 'gathering' then crew
    when 'expired' then array[organiser]
    when 'arrived' then crew
    when 'arrival_undone' then crew
    when 'late' then crew
    when 'time_revised' then private.ride_people(new.ride_id, '{accepted,requested}')
    when 'details_changed' then crew
    when 'split_mode_changed' then crew
    when 'departed' then boarded
    when 'no_show' then array[new.member_id]
    when 'appealed' then boarded
    when 'appeal_confirmed' then array[new.member_id]
    when 'appeal_lapsed' then array[new.member_id]
    when 'reached' then boarded
    when 'split_sent' then boarded
    when 'receipt_set' then boarded
    when 'share_disputed' then array[organiser]
    when 'share_changed' then array[new.member_id]
    when 'settled' then boarded
  end;
  if new.kind in ('arrived', 'arrival_undone', 'late') then
    kind := 'ride.arrival';
  end if;
  perform private.emit_event(coalesce(recipients, '{}'), kind, new.ride_id, new.actor_id);
  return new;
end;
$$;

create trigger ride_events_fanout
  after insert on public.ride_events
  for each row execute function private.ride_event_fanout();

create function private.ride_payment_fanout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.item_kind <> 'ride' then
    return new;
  end if;
  if old.state = 'due' and new.state = 'marked_paid' then
    perform private.emit_event(array[new.payee_id], 'payment.marked_paid', new.id, new.payer_id);
  end if;
  if new.state = 'marked_paid' and old.nudged_at is null and new.nudged_at is not null then
    perform private.emit_event(array[new.payer_id], 'payment.not_received', new.id, new.payee_id);
  end if;
  if old.state <> 'settled' and new.state = 'settled' then
    perform private.emit_event(array[new.payer_id], 'payment.settled', new.id, new.payee_id);
  end if;
  return new;
end;
$$;

create trigger payments_ride_fanout
  after update of state, nudged_at on public.payments
  for each row execute function private.ride_payment_fanout();

create function public.delete_old_events() returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (delete from public.events where created_at < now() - interval '7 days' returning 1)
  select count(*)::integer from gone;
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
          'myPaid', (select private.ride_paid(p.state) from public.payments p where p.id = mine.payment_id),
          'myDueSince', (
            select p.created_at from public.payments p
            where p.id = mine.payment_id and p.state = 'due' and p.payer_id = (select auth.uid())
          ),
          'eta', case when mine.my_status in ('accepted', 'boarded') then (
            select d.eta from public.ride_details d where d.ride_id = (mine.r).id
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

revoke all on function private.quiet_until(timestamptz) from public, anon, authenticated;
revoke all on function private.record_push() from public, anon, authenticated;
revoke all on function private.emit_event(uuid[], text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.ride_people(uuid, public.ride_member_status[]) from public, anon, authenticated;
revoke all on function private.ride_event_fanout() from public, anon, authenticated;
revoke all on function private.ride_payment_fanout() from public, anon, authenticated;
revoke all on function public.delete_old_events() from public, anon, authenticated;
grant execute on function public.delete_old_events() to service_role;

select cron.schedule('events-cleanup-daily', '45 19 * * *', $$select public.delete_old_events()$$);

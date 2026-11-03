create policy user_topic_receive on realtime.messages
  for select
  to authenticated
  using (
    extension = 'broadcast'
    and topic = (select realtime.topic())
    and topic = 'user:' || (select auth.uid())::text
  );

alter table public.events add column actor_id uuid references auth.users (id) on delete set null;

create or replace function private.emit_event(recipients uuid[], kind text, subject uuid, actor uuid) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.events (recipient, kind, subject_id, push, actor_id)
  select distinct person, k.kind, subject, k.push, actor
  from unnest(recipients) person
  join private.event_kinds k on k.kind = emit_event.kind
  where person is not null and person is distinct from actor;
$$;

-- realtime.send swallows its own errors (a missing daily partition only logs WarnSendingBroadcastMessage), so a
-- failed broadcast never rolls back the transition; the app's refetch covers the gap.
create function private.broadcast_event() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('kind', new.kind, 'id', new.subject_id, 'at', new.created_at),
    new.kind,
    'user:' || new.recipient::text,
    true
  );
  return new;
end;
$$;

create trigger events_broadcast
  after insert on public.events
  for each row execute function private.broadcast_event();

insert into private.event_kinds (kind, push)
values
  ('bounty.applied', true),
  ('bounty.withdrawn', false),
  ('bounty.selected', true),
  ('bounty.not_selected', false),
  ('bounty.started', true),
  ('bounty.eta_changed', true),
  ('bounty.completed', true),
  ('bounty.issue', true),
  ('bounty.cancelled', true),
  ('bounty.expired', false),
  ('bounty.confirmed', false);

create function private.bounty_applicants(bounty uuid, statuses public.bounty_application_status[]) returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(a.applicant_id), '{}') from public.bounty_applications a
  where a.bounty_id = bounty and a.status = any (statuses);
$$;

create function private.bounty_event_fanout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties := (select x from public.bounties x where x.id = new.bounty_id);
  poster uuid[] := array[b.poster_id];
  both_sides uuid[] := array[b.poster_id, b.helper_id];
begin
  case new.kind
    when 'applied' then perform private.emit_event(poster, 'bounty.applied', b.id, new.actor_id);
    when 'withdrawn' then perform private.emit_event(poster, 'bounty.withdrawn', b.id, new.actor_id);
    when 'selected' then
      perform private.emit_event(array[b.helper_id], 'bounty.selected', b.id, new.actor_id);
      perform private.emit_event(
        private.bounty_applicants(b.id, '{not_selected}'), 'bounty.not_selected', b.id, new.actor_id
      );
    when 'started' then perform private.emit_event(poster, 'bounty.started', b.id, new.actor_id);
    when 'eta_changed' then perform private.emit_event(poster, 'bounty.eta_changed', b.id, new.actor_id);
    when 'completed' then perform private.emit_event(poster, 'bounty.completed', b.id, new.actor_id);
    when 'problem_reported' then perform private.emit_event(array[b.helper_id], 'bounty.issue', b.id, new.actor_id);
    when 'cancelled' then perform private.emit_event(both_sides, 'bounty.cancelled', b.id, new.actor_id);
    when 'closed' then
      perform private.emit_event(
        array(
          select a from unnest(private.bounty_applicants(b.id, '{pending}')) a
          where not private.is_blocked_between(b.poster_id, a)
        ),
        'bounty.cancelled', b.id, new.actor_id
      );
    when 'expired' then perform private.emit_event(poster, 'bounty.expired', b.id, new.actor_id);
    when 'confirmed', 'auto_confirmed' then
      perform private.emit_event(both_sides, 'bounty.confirmed', b.id, new.actor_id);
    else null;
  end case;
  return new;
end;
$$;

create trigger bounty_events_fanout
  after insert on public.bounty_events
  for each row execute function private.bounty_event_fanout();

drop trigger payments_ride_fanout on public.payments;
drop function private.ride_payment_fanout();

create function private.payment_fanout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger payments_fanout
  after update of state, nudged_at on public.payments
  for each row execute function private.payment_fanout();

revoke all on function private.emit_event(uuid[], text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.broadcast_event() from public, anon, authenticated;
revoke all on function private.bounty_applicants(uuid, public.bounty_application_status[])
  from public, anon, authenticated;
revoke all on function private.bounty_event_fanout() from public, anon, authenticated;
revoke all on function private.payment_fanout() from public, anon, authenticated;

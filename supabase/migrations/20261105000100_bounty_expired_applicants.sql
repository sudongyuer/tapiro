create or replace function private.bounty_event_fanout() returns trigger
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
    when 'expired' then
      perform private.emit_event(
        poster || array(
          select a from unnest(private.bounty_applicants(b.id, '{pending}')) a
          where not private.is_blocked_between(b.poster_id, a)
        ),
        'bounty.expired', b.id, new.actor_id
      );
    when 'confirmed', 'auto_confirmed' then
      perform private.emit_event(both_sides, 'bounty.confirmed', b.id, new.actor_id);
    else null;
  end case;
  return new;
end;
$$;

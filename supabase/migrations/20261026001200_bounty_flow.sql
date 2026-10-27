create function private.locked_bounty(bounty uuid) returns public.bounties
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties;
begin
  select * into b from public.bounties where id = bounty for update;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  return b;
end;
$$;

-- Before a helper is selected nobody is the helper, so the status answers rather than the actor.
create function private.locked_bounty_as_helper(bounty uuid, uid uuid) returns public.bounties
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties := private.locked_bounty(bounty);
begin
  if b.helper_id is null then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if b.helper_id is distinct from uid then
    raise exception 'not_helper' using errcode = '42501';
  end if;
  return b;
end;
$$;

create function private.locked_bounty_as_poster(bounty uuid, uid uuid) returns public.bounties
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties := private.locked_bounty(bounty);
begin
  if b.poster_id is distinct from uid then
    raise exception 'not_poster' using errcode = '42501';
  end if;
  return b;
end;
$$;

create function public.select_helper(bounty uuid, applicant uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_poster(bounty, uid);
begin
  if b.status = 'assigned' and b.helper_id = applicant then
    return jsonb_build_object('status', 'assigned', 'helperId', b.helper_id);
  end if;
  if b.status in ('closed', 'cancelled') or (b.status = 'open' and b.expires_at <= now()) then
    raise exception 'closed' using errcode = '55000';
  end if;
  if b.status <> 'open' then
    raise exception 'taken' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.bounty_applications
    where bounty_id = bounty and applicant_id = applicant and status = 'pending'
  ) then
    raise exception 'not_pending' using errcode = '55000';
  end if;
  if private.is_blocked_between(uid, applicant) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  update public.bounty_applications
  set status = case when applicant_id = applicant then 'selected' else 'not_selected' end::public.bounty_application_status
  where bounty_id = bounty and status = 'pending';
  update public.bounties set status = 'assigned', helper_id = applicant, status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
  values (bounty, 'selected', uid, 'open', 'assigned');
  return jsonb_build_object('status', 'assigned', 'helperId', applicant);
end;
$$;

create function public.start_bounty(bounty uuid, eta timestamptz default null) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_helper(bounty, uid);
begin
  if b.status = 'en_route' then
    return jsonb_build_object('status', 'en_route', 'etaAt', b.eta_at);
  end if;
  if b.status <> 'assigned' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if eta <= now() then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  update public.bounties set status = 'en_route', eta_at = eta, status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status, eta_at)
  values (bounty, 'started', uid, 'assigned', 'en_route', eta);
  return jsonb_build_object('status', 'en_route', 'etaAt', eta);
end;
$$;

create function public.update_eta(bounty uuid, eta timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_helper(bounty, uid);
begin
  if b.status <> 'en_route' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if eta is null or eta <= now() or eta = b.eta_at then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  update public.bounties set eta_at = eta, previous_eta_at = b.eta_at where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status, eta_at, previous_eta_at)
  values (bounty, 'eta_changed', uid, 'en_route', 'en_route', eta, b.eta_at);
  return jsonb_build_object('status', 'en_route', 'etaAt', eta, 'previousEtaAt', b.eta_at);
end;
$$;

create function public.complete_bounty(bounty uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_helper(bounty, uid);
begin
  if b.status = 'done' then
    return jsonb_build_object('status', 'done', 'autoConfirmAt', b.done_at + interval '48 hours');
  end if;
  if b.status not in ('en_route', 'disputed') then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.bounties set status = 'done', done_at = now(), status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
  values (bounty, 'completed', uid, b.status, 'done');
  return jsonb_build_object('status', 'done', 'autoConfirmAt', now() + interval '48 hours');
end;
$$;

create function public.report_bounty_problem(bounty uuid, reason text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_poster(bounty, uid);
  cleaned text := btrim(reason);
begin
  if b.status = 'disputed' then
    return jsonb_build_object('status', 'disputed');
  end if;
  if b.status <> 'done' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if cleaned is null or char_length(cleaned) not between 1 and 140 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  update public.bounties set status = 'disputed', status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status, reason)
  values (bounty, 'problem_reported', uid, 'done', 'disputed', cleaned);
  return jsonb_build_object('status', 'disputed');
end;
$$;

create function private.confirm_bounty(bounty uuid, actor uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties := private.locked_bounty(bounty);
begin
  if not (b.status = 'done' or (b.status = 'disputed' and actor is not null)) then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.bounties set status = 'confirmed', status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
  values (bounty, case when actor is null then 'auto_confirmed' else 'confirmed' end::public.bounty_event_kind,
    actor, b.status, 'confirmed');
  return public.open_payment('bounty', b.id, b.title, b.poster_id, b.helper_id, b.reward_sen, null, b.category);
end;
$$;

create function public.confirm_bounty(bounty uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty_as_poster(bounty, uid);
  payment uuid;
begin
  if b.status = 'confirmed' and exists (
    select 1 from public.bounty_events where bounty_id = bounty and kind = 'confirmed' and actor_id = uid
  ) then
    payment := (
      select id from public.payments where item_kind = 'bounty' and item_id = bounty and reverses is null
    );
  elsif b.status in ('done', 'disputed') then
    payment := private.confirm_bounty(bounty, uid);
  else
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  return jsonb_build_object('status', 'confirmed', 'paymentId', payment);
end;
$$;

revoke all on function private.locked_bounty(uuid) from public, anon, authenticated;
revoke all on function private.locked_bounty_as_helper(uuid, uuid) from public, anon, authenticated;
revoke all on function private.locked_bounty_as_poster(uuid, uuid) from public, anon, authenticated;
revoke all on function private.confirm_bounty(uuid, uuid) from public, anon, authenticated;
revoke all on function public.select_helper(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_bounty(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.update_eta(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.complete_bounty(uuid) from public, anon, authenticated;
revoke all on function public.report_bounty_problem(uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_bounty(uuid) from public, anon, authenticated;

grant execute on function public.select_helper(uuid, uuid) to authenticated;
grant execute on function public.start_bounty(uuid, timestamptz) to authenticated;
grant execute on function public.update_eta(uuid, timestamptz) to authenticated;
grant execute on function public.complete_bounty(uuid) to authenticated;
grant execute on function public.report_bounty_problem(uuid, text) to authenticated;
grant execute on function public.confirm_bounty(uuid) to authenticated;

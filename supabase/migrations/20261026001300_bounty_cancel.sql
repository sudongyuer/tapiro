create function private.no_show_offender(b public.bounties, canceller uuid) returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when canceller = b.poster_id and b.status = 'assigned' and b.starts_at is not null
      and now() > b.starts_at + interval '30 minutes'
    then b.helper_id
    else canceller
  end;
$$;

create function private.cancellable_by(b public.bounties, uid uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  if uid is null or uid not in (b.poster_id, b.helper_id) then
    raise exception 'not_helper' using errcode = '42501';
  end if;
  if b.status not in ('assigned', 'en_route') then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
end;
$$;

create function public.bounty_cancel_preview(bounty uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  offender uuid;
begin
  select * into b from public.bounties where id = bounty;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  perform private.cancellable_by(b, uid);
  offender := private.no_show_offender(b, uid);
  return jsonb_build_object(
    'offender', case when offender = uid then 'self' else 'other' end,
    'waiverAvailable', case when offender = uid then not exists (
      select 1 from public.reputation_events
      where user_id = uid and kind = 'no_show' and waived and created_at > now() - interval '60 days'
    ) end
  );
end;
$$;

create function public.cancel_bounty(bounty uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties := private.locked_bounty(bounty);
  offender uuid;
  outcome text;
begin
  if b.status = 'cancelled' and exists (
    select 1 from public.bounty_events where bounty_id = bounty and kind = 'cancelled' and actor_id = uid
  ) then
    select r.user_id, case when r.waived then 'waived' else 'counted' end into offender, outcome
    from public.reputation_events r
    where r.kind = 'no_show' and r.item_kind = 'bounty' and r.item_id = bounty;
  else
    perform private.cancellable_by(b, uid);
    offender := private.no_show_offender(b, uid);
    outcome := public.record_no_show(offender, 'bounty', bounty);
    update public.bounties set status = 'cancelled', status_changed_at = now() where id = bounty;
    insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
    values (bounty, 'cancelled', uid, b.status, 'cancelled');
  end if;
  return jsonb_build_object(
    'status', 'cancelled',
    'offender', case when offender = uid then 'self' else 'other' end,
    'noShow', case when offender = uid then outcome end
  );
end;
$$;

revoke all on function private.no_show_offender(public.bounties, uuid) from public, anon, authenticated;
revoke all on function private.cancellable_by(public.bounties, uuid) from public, anon, authenticated;
revoke all on function public.bounty_cancel_preview(uuid) from public, anon, authenticated;
revoke all on function public.cancel_bounty(uuid) from public, anon, authenticated;

grant execute on function public.bounty_cancel_preview(uuid) to authenticated;
grant execute on function public.cancel_bounty(uuid) to authenticated;

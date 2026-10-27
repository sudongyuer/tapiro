create function public.apply_to_bounty(bounty uuid, note text default null) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  application public.bounty_applications;
  cleaned text := nullif(btrim(note), '');
begin
  select * into b from public.bounties where id = bounty for update;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  if b.poster_id = uid then
    raise exception 'own_bounty' using errcode = '22023';
  end if;
  if exists (select 1 from public.blocks where blocker_id = uid and blocked_id = b.poster_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  -- The blocked side is told the bounty is closed so a block is not revealed to the person blocked.
  if b.status in ('closed', 'cancelled')
    or (b.status = 'open' and b.expires_at <= now())
    or exists (select 1 from public.blocks where blocker_id = b.poster_id and blocked_id = uid)
  then
    raise exception 'closed' using errcode = '55000';
  end if;
  if b.status <> 'open' then
    raise exception 'taken' using errcode = '55000';
  end if;
  if not exists (select 1 from public.payee_methods where user_id = uid) then
    raise exception 'no_payee_method' using errcode = '55000';
  end if;
  select * into application from public.bounty_applications
  where bounty_id = bounty and applicant_id = uid
  for update;
  if found and application.status = 'pending' then
    return jsonb_build_object('status', 'pending', 'note', application.note);
  elsif found and application.status = 'withdrawn' then
    update public.bounty_applications set status = 'pending', note = cleaned
    where bounty_id = bounty and applicant_id = uid;
  elsif found then
    raise exception 'not_pending' using errcode = '55000';
  else
    insert into public.bounty_applications (bounty_id, applicant_id, note) values (bounty, uid, cleaned);
  end if;
  insert into public.bounty_events (bounty_id, kind, actor_id) values (bounty, 'applied', uid);
  return jsonb_build_object('status', 'pending', 'note', cleaned);
end;
$$;

create function public.withdraw_application(bounty uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  application public.bounty_applications;
begin
  select * into b from public.bounties where id = bounty for update;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  select * into application from public.bounty_applications
  where bounty_id = bounty and applicant_id = uid
  for update;
  if found and application.status = 'withdrawn' then
    return jsonb_build_object('status', 'withdrawn');
  end if;
  if not found or application.status <> 'pending' or b.status <> 'open' then
    raise exception 'not_pending' using errcode = '55000';
  end if;
  update public.bounty_applications set status = 'withdrawn' where bounty_id = bounty and applicant_id = uid;
  insert into public.bounty_events (bounty_id, kind, actor_id) values (bounty, 'withdrawn', uid);
  return jsonb_build_object('status', 'withdrawn');
end;
$$;

revoke all on function public.apply_to_bounty(uuid, text) from public, anon, authenticated;
revoke all on function public.withdraw_application(uuid) from public, anon, authenticated;
grant execute on function public.apply_to_bounty(uuid, text) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;

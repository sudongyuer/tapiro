create function private.bounty_status(b public.bounties) returns text
language sql
stable
set search_path = ''
as $$
  select case
    when b.status = 'confirmed' and exists (
      select 1 from public.payments p
      where p.item_kind = 'bounty' and p.item_id = b.id and p.reverses is null and p.state = 'settled'
    ) then 'settled'
    else b.status::text
  end;
$$;

-- Mirrors the bounties_select policy, so a read function shows exactly the rows RLS would.
create function private.bounty_viewer_role(b public.bounties, uid uuid) returns text
language sql
stable
set search_path = ''
as $$
  select case
    when uid is null then null
    when b.poster_id = uid then 'poster'
    when b.helper_id = uid then 'helper'
    when private.is_blocked_between(uid, b.poster_id) then null
    when exists (
      select 1 from public.bounty_applications a where a.bounty_id = b.id and a.applicant_id = uid
    ) then 'applicant'
    when b.status = 'open' then 'viewer'
  end;
$$;

create function private.bounty_person(uid uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when uid is not null then jsonb_build_object(
    'id', uid,
    'name', (select p.display_name from public.profiles p where p.id = uid),
    'tier', public.reputation_tier(uid)
  ) end;
$$;

create function private.bounty_person_name(uid uuid) returns text
language sql
stable
set search_path = ''
as $$
  select p.display_name from public.profiles p where p.id = uid;
$$;

create function private.pending_applicants(b public.bounties) returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.bounty_applications a
  where a.bounty_id = b.id and a.status = 'pending' and not private.is_blocked_between(b.poster_id, a.applicant_id);
$$;

create function private.bounty_issue_reason(b public.bounties) returns text
language sql
stable
set search_path = ''
as $$
  select case when b.status = 'disputed' then (
    select e.reason from public.bounty_events e
    where e.bounty_id = b.id and e.kind = 'problem_reported'
    order by e.created_at desc, e.id desc
    limit 1
  ) end;
$$;

create function private.bounty_expired_card(b public.bounties) returns boolean
language sql
stable
set search_path = ''
as $$
  select b.status = 'closed'
    and exists (select 1 from public.bounty_events e where e.bounty_id = b.id and e.kind = 'expired');
$$;

create function private.bounty_summary(b public.bounties, counterpart uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'category', b.category,
    'rewardSen', b.reward_sen,
    'status', private.bounty_status(b),
    'placeLabel', b.place_label,
    'startsAt', b.starts_at,
    'deadlineAt', b.deadline_at,
    'expiresAt', b.expires_at,
    'counterpartName', private.bounty_person_name(counterpart)
  );
$$;

create function public.bounty_detail(bounty uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  role text;
  party boolean;
begin
  select * into b from public.bounties where id = bounty;
  if found then
    role := private.bounty_viewer_role(b, uid);
  end if;
  if role is null then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  party := role in ('poster', 'helper');
  return jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'category', b.category,
    'rewardSen', b.reward_sen,
    'status', private.bounty_status(b),
    'viewerRole', role,
    'place', case when b.place is not null then jsonb_build_object(
      'label', b.place_label,
      'latitude', extensions.st_y(b.place::extensions.geometry),
      'longitude', extensions.st_x(b.place::extensions.geometry)
    ) end,
    'address', case
      when role = 'poster' or (role = 'helper' and b.status in ('assigned', 'en_route', 'done', 'disputed', 'confirmed'))
      then (select a.address from public.bounty_addresses a where a.bounty_id = b.id)
    end,
    'startsAt', b.starts_at,
    'endsAt', b.ends_at,
    'deadlineAt', b.deadline_at,
    'expiresAt', b.expires_at,
    'publishedAt', b.published_at,
    'poster', private.bounty_person(b.poster_id),
    'helper', case when party then private.bounty_person(b.helper_id) end,
    'myApplication', (
      select jsonb_build_object('status', a.status, 'note', a.note)
      from public.bounty_applications a
      where a.bounty_id = b.id and a.applicant_id = uid
    ),
    'applicantCount', case when role = 'poster' then private.pending_applicants(b) end,
    'etaAt', case when party then b.eta_at end,
    'previousEtaAt', case when party then b.previous_eta_at end,
    'autoConfirmAt', case when b.status = 'done' then b.done_at + interval '48 hours' end,
    'startLate', b.status = 'assigned' and coalesce(b.starts_at <= now(), false),
    'issueReason', case when party then private.bounty_issue_reason(b) end,
    'payment', case when party then (
      select jsonb_build_object('id', p.id, 'state', p.state)
      from public.payments p
      where p.item_kind = 'bounty' and p.item_id = b.id and p.reverses is null
    ) end,
    'events', case when party then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', e.kind,
        'at', e.created_at,
        'actor', case
          when e.actor_id is null then null
          when e.actor_id = b.poster_id then 'poster'
          when e.actor_id = b.helper_id then 'helper'
        end,
        'from', e.from_status,
        'to', e.to_status,
        'etaAt', e.eta_at,
        'previousEtaAt', e.previous_eta_at,
        'reason', e.reason
      ) order by e.created_at, e.id), '[]'::jsonb)
      from public.bounty_events e
      where e.bounty_id = b.id
        and (
          e.kind not in ('applied', 'withdrawn')
          or (role = 'poster' and not private.is_blocked_between(uid, e.actor_id))
          or (role = 'helper' and e.actor_id = uid)
        )
    ) end
  );
end;
$$;

create function public.my_bounties() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with posted as (
    select b, row_number() over (
      partition by b.status in ('confirmed', 'closed', 'cancelled')
      order by b.status_changed_at desc, b.id desc
    ) as n
    from public.bounties b
    where b.poster_id = (select auth.uid())
  ),
  applied as (
    select b, a.status as application_status, row_number() over (
      partition by b.status in ('confirmed', 'closed', 'cancelled')
      order by b.status_changed_at desc, b.id desc
    ) as n
    from public.bounty_applications a
    join public.bounties b on b.id = a.bounty_id
    where a.applicant_id = (select auth.uid())
      and a.status <> 'withdrawn'
      and private.bounty_viewer_role(b, (select auth.uid())) is not null
  )
  select jsonb_build_object(
    'posted', (
      select coalesce(jsonb_agg(
        private.bounty_summary(p.b, (p.b).helper_id)
          || jsonb_build_object('applicantCount', private.pending_applicants(p.b), 'applicationStatus', null)
        order by (p.b).status_changed_at desc, (p.b).id desc
      ), '[]'::jsonb)
      from posted p
      where (p.b).status not in ('confirmed', 'closed', 'cancelled') or p.n <= 20
    ),
    'applied', (
      select coalesce(jsonb_agg(
        private.bounty_summary(x.b, (x.b).poster_id)
          || jsonb_build_object('applicantCount', null, 'applicationStatus', x.application_status)
        order by (x.b).status_changed_at desc, (x.b).id desc
      ), '[]'::jsonb)
      from applied x
      where (x.b).status not in ('confirmed', 'closed', 'cancelled') or x.n <= 20
    )
  );
$$;

create function public.bounty_applicants(bounty uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
begin
  select * into b from public.bounties where id = bounty;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  if b.poster_id is distinct from uid then
    raise exception 'not_poster' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'applicantId', a.applicant_id,
      'name', private.bounty_person_name(a.applicant_id),
      'tier', public.reputation_tier(a.applicant_id),
      'note', a.note,
      'status', a.status,
      'appliedAt', a.created_at
    ) order by a.created_at, a.applicant_id), '[]'::jsonb)
    from public.bounty_applications a
    where a.bounty_id = b.id
      and a.status in ('pending', 'selected')
      and not private.is_blocked_between(uid, a.applicant_id)
  );
end;
$$;

create function public.bounty_live_items() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  items as (
    select b.id, 'poster' as role,
      case
        when b.status = 'closed' then 'oneTime'
        when b.status = 'done' or (b.status = 'open' and private.pending_applicants(b) > 0) then 'bountyAction'
        else 'bountyInProgress'
      end as kind,
      case
        when b.status = 'done' then 'confirm'
        when b.status = 'open' and private.pending_applicants(b) > 0 then 'choose'
      end as action,
      case when b.status = 'closed' then 'expired' end as card
    from public.bounties b, me
    where b.poster_id = me.uid
      and (
        b.status in ('open', 'assigned', 'en_route', 'done', 'disputed')
        or (
          private.bounty_expired_card(b)
          and not exists (
            select 1 from public.bounty_seen s where s.user_id = me.uid and s.bounty_id = b.id and s.card = 'expired'
          )
        )
      )
    union all
    select b.id, 'helper',
      case when b.status in ('assigned', 'disputed') then 'bountyAction' else 'bountyInProgress' end,
      case b.status when 'assigned' then 'start' when 'disputed' then 'resolveIssue' end,
      null
    from public.bounties b, me
    where b.helper_id = me.uid and b.status in ('assigned', 'en_route', 'done', 'disputed')
    union all
    select b.id, 'applicant', 'oneTime', null, 'not_selected'
    from public.bounty_applications a
    join public.bounties b on b.id = a.bounty_id
    cross join me
    where a.applicant_id = me.uid
      and a.status = 'not_selected'
      and private.bounty_viewer_role(b, me.uid) = 'applicant'
      and not exists (
        select 1 from public.bounty_seen s
        where s.user_id = me.uid and s.bounty_id = b.id and s.card = 'not_selected'
      )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bountyId', b.id,
    'title', b.title,
    'category', b.category,
    'rewardSen', b.reward_sen,
    'role', i.role,
    'kind', i.kind,
    'action', i.action,
    'card', i.card,
    'status', private.bounty_status(b),
    'counterpartName', private.bounty_person_name(case when i.role = 'poster' then b.helper_id else b.poster_id end),
    'applicantCount', case when i.role = 'poster' and b.status = 'open' then private.pending_applicants(b) end,
    'startsAt', b.starts_at,
    'startLate', b.status = 'assigned' and coalesce(b.starts_at <= now(), false),
    'etaAt', case when i.role <> 'applicant' then b.eta_at end,
    'previousEtaAt', case when i.role <> 'applicant' then b.previous_eta_at end,
    'autoConfirmAt', case when b.status = 'done' then b.done_at + interval '48 hours' end,
    'issueReason', case when i.role <> 'applicant' then private.bounty_issue_reason(b) end,
    'refund', case when i.card = 'expired' then (
      select c.charge from public.post_charges c
      where c.item_kind = 'bounty' and c.item_id = b.id and c.refunded_at is not null
    ) end
  ) order by b.status_changed_at desc, b.id), '[]'::jsonb)
  from items i
  join public.bounties b on b.id = i.id;
$$;

create function public.mark_bounty_seen(bounty uuid, card public.bounty_seen_card) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  role text;
begin
  select * into b from public.bounties where id = bounty;
  if found then
    role := private.bounty_viewer_role(b, uid);
  end if;
  if role is null
    or mark_bounty_seen.card is null
    or (mark_bounty_seen.card = 'not_selected' and not exists (
      select 1 from public.bounty_applications a
      where a.bounty_id = b.id and a.applicant_id = uid and a.status = 'not_selected'
    ))
    or (mark_bounty_seen.card = 'expired' and not (role = 'poster' and private.bounty_expired_card(b)))
  then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  insert into public.bounty_seen (user_id, bounty_id, card)
  values (uid, b.id, mark_bounty_seen.card)
  on conflict do nothing;
end;
$$;

revoke all on function private.bounty_status(public.bounties) from public, anon, authenticated;
revoke all on function private.bounty_viewer_role(public.bounties, uuid) from public, anon, authenticated;
revoke all on function private.bounty_person(uuid) from public, anon, authenticated;
revoke all on function private.bounty_person_name(uuid) from public, anon, authenticated;
revoke all on function private.pending_applicants(public.bounties) from public, anon, authenticated;
revoke all on function private.bounty_issue_reason(public.bounties) from public, anon, authenticated;
revoke all on function private.bounty_expired_card(public.bounties) from public, anon, authenticated;
revoke all on function private.bounty_summary(public.bounties, uuid) from public, anon, authenticated;
revoke all on function public.bounty_detail(uuid) from public, anon, authenticated;
revoke all on function public.my_bounties() from public, anon, authenticated;
revoke all on function public.bounty_applicants(uuid) from public, anon, authenticated;
revoke all on function public.bounty_live_items() from public, anon, authenticated;
revoke all on function public.mark_bounty_seen(uuid, public.bounty_seen_card) from public, anon, authenticated;

grant execute on function public.bounty_detail(uuid) to authenticated;
grant execute on function public.my_bounties() to authenticated;
grant execute on function public.bounty_applicants(uuid) to authenticated;
grant execute on function public.bounty_live_items() to authenticated;
grant execute on function public.mark_bounty_seen(uuid, public.bounty_seen_card) to authenticated;

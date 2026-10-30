create or replace function private.bounty_summary(b public.bounties, counterpart uuid, shown text) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'category', b.category,
    'art', b.art,
    'rewardMinor', b.reward_minor,
    'rewardCurrency', b.reward_currency,
    'status', shown,
    'placeLabel', b.place_label,
    'startsAt', b.starts_at,
    'deadlineAt', b.deadline_at,
    'expiresAt', b.expires_at,
    'counterpartName', private.bounty_person_name(counterpart)
  );
$$;

create or replace function public.bounty_live_items() returns jsonb
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
    union all
    select b.id, 'applicant', 'bountyInProgress', null, null
    from public.bounty_applications a
    join public.bounties b on b.id = a.bounty_id
    cross join me
    where a.applicant_id = me.uid
      and a.status = 'pending'
      and b.status = 'open'
      and not private.is_blocked_between(me.uid, b.poster_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bountyId', b.id,
    'title', b.title,
    'category', b.category,
    'art', b.art,
    'rewardMinor', b.reward_minor,
    'rewardCurrency', b.reward_currency,
    'role', i.role,
    'kind', i.kind,
    'action', i.action,
    'card', i.card,
    'status', private.bounty_status_for(b, i.role <> 'applicant'),
    'counterpartName', private.bounty_person_name(case when i.role = 'poster' then b.helper_id else b.poster_id end),
    'applicantCount', case when i.role = 'poster' and b.status = 'open' then private.pending_applicants(b) end,
    'startsAt', b.starts_at,
    'startLate', i.role <> 'applicant' and b.status = 'assigned' and coalesce(b.starts_at <= now(), false),
    'etaAt', case when i.role <> 'applicant' then b.eta_at end,
    'previousEtaAt', case when i.role <> 'applicant' then b.previous_eta_at end,
    'autoConfirmAt', case when i.role <> 'applicant' and b.status = 'done' then b.done_at + interval '48 hours' end,
    'issueReason', case when i.role <> 'applicant' then private.bounty_issue_reason(b) end,
    'refund', case when i.card = 'expired' then (
      select c.charge from public.post_charges c
      where c.item_kind = 'bounty' and c.item_id = b.id and c.refunded_at is not null
    ) end
  ) order by b.status_changed_at desc, b.id), '[]'::jsonb)
  from items i
  join public.bounties b on b.id = i.id;
$$;

create or replace function public.bounty_detail(
  bounty uuid,
  latitude double precision default null,
  longitude double precision default null,
  reference_currency text default null
) returns jsonb
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
  here extensions.geography;
begin
  if (latitude is null) <> (longitude is null)
    or latitude not between -90 and 90
    or longitude not between -180 and 180
  then
    raise exception 'invalid_point' using errcode = '22023';
  end if;
  if latitude is not null then
    here := extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography;
  end if;
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
    'art', b.art,
    'rewardMinor', b.reward_minor,
    'rewardCurrency', b.reward_currency,
    'reference', case when not exists (
      select 1 from public.payments p where p.item_kind = 'bounty' and p.item_id = b.id and p.reverses is null
    ) then private.reference_money(b.reward_minor, b.reward_currency, reference_currency) end,
    'status', private.bounty_status_for(b, party),
    'viewerRole', role,
    'place', case
      when b.place is null then null
      when party then jsonb_build_object(
        'label', b.place_label,
        'latitude', extensions.st_y(b.place::extensions.geometry),
        'longitude', extensions.st_x(b.place::extensions.geometry)
      )
      else jsonb_build_object('label', b.place_label)
    end,
    'distanceM', private.rounded_distance(case when party then b.place else b.place_public end, here),
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
    'autoConfirmAt', case when party and b.status = 'done' then b.done_at + interval '48 hours' end,
    'startLate', party and b.status = 'assigned' and coalesce(b.starts_at <= now(), false),
    'issueReason', case when party then private.bounty_issue_reason(b) end,
    'payment', case when party then (
      select private.bounty_payment(p, reference_currency)
      from public.payments p
      where p.item_kind = 'bounty' and p.item_id = b.id and p.reverses is null
    ) end,
    'charge', case when role = 'poster' and b.status = 'open' then (
      select c.charge from public.post_charges c where c.item_kind = 'bounty' and c.item_id = b.id
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

revoke all on function public.bounty_detail(uuid, double precision, double precision, text)
  from public, anon, authenticated;
grant execute on function public.bounty_detail(uuid, double precision, double precision, text) to authenticated;

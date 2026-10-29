create function private.bounty_payment(p public.payments, target text) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'state', p.state,
    'amountMinor', p.amount_minor,
    'currency', p.currency,
    'converted', case
      when target is not null and target <> p.currency and target in (p.rate_base, p.rate_quote) then
        jsonb_build_object(
          'minor', private.convert_minor(
            p.amount_minor, p.currency, target, p.rate_base, p.rate_quote, p.rate_quote_per_base
          ),
          'currency', target
        )
    end
  );
$$;

revoke all on function private.bounty_payment(public.payments, text) from public, anon, authenticated;

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

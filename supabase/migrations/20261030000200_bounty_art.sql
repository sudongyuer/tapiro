alter table public.bounties add column art text
  constraint bounties_art_slug check (art ~ '^[a-z][a-z0-9-]{0,31}$');

create function private.bounty_art(kind public.payment_item_kind, item uuid) returns text
language sql
stable
set search_path = ''
as $$
  select b.art from public.bounties b where bounty_art.kind = 'bounty' and b.id = bounty_art.item;
$$;

revoke all on function private.bounty_art(public.payment_item_kind, uuid) from public, anon, authenticated;

drop function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz
);

-- A replay of an id that is already published only returns the first answer when it carries the same content.
-- Different content under a published id means the client lost the first answer and the user edited the draft
-- afterwards; returning success would show content that is not what was stored.
create function public.publish_bounty(
  id uuid,
  title text,
  category public.bounty_category,
  reward_minor bigint,
  reward_currency text,
  description text default null,
  place_label text default null,
  latitude double precision default null,
  longitude double precision default null,
  address text default null,
  starts_at timestamptz default null,
  ends_at timestamptz default null,
  deadline_at timestamptz default null,
  art text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  stored public.bounties;
  label text := nullif(btrim(publish_bounty.place_label), '');
  detail text := nullif(btrim(publish_bounty.address), '');
  charged text;
begin
  if publish_bounty.id is null then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  select * into stored from public.bounties b where b.id = publish_bounty.id;
  if not found then
    if (latitude is null) <> (longitude is null)
      or latitude not between -90 and 90
      or longitude not between -180 and 180
      or (latitude is null) <> (label is null)
      or (detail is not null and latitude is null)
      or publish_bounty.starts_at < now()
      or publish_bounty.ends_at < now()
      or publish_bounty.deadline_at < now()
      or publish_bounty.deadline_at > now() + interval '30 days'
      or publish_bounty.starts_at > now() + interval '30 days'
      or publish_bounty.deadline_at < publish_bounty.starts_at
      or publish_bounty.art !~ '^[a-z][a-z0-9-]{0,31}$'
    then
      raise exception 'invalid_bounty' using errcode = '22023';
    end if;
    if not private.within_post_limits('bounty', publish_bounty.reward_minor, publish_bounty.reward_currency)
      or not exists (
        select 1 from public.currencies c where c.code = publish_bounty.reward_currency and c.enabled
      )
    then
      raise exception 'invalid_reward' using errcode = '22023';
    end if;
    if public.publish_blocked() then
      raise exception 'publish_blocked' using errcode = '55000';
    end if;
    insert into public.bounties as b (
      id, poster_id, title, description, category, reward_minor, reward_currency, place, place_label, starts_at,
      ends_at, deadline_at, expires_at, art
    )
    values (
      publish_bounty.id, uid, btrim(publish_bounty.title), nullif(btrim(publish_bounty.description), ''),
      publish_bounty.category, publish_bounty.reward_minor, publish_bounty.reward_currency,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography, label,
      publish_bounty.starts_at, publish_bounty.ends_at, publish_bounty.deadline_at,
      coalesce(publish_bounty.deadline_at, now() + interval '7 days'), publish_bounty.art
    )
    on conflict on constraint bounties_pkey do nothing
    returning * into stored;
    if found then
      if detail is not null then
        insert into public.bounty_addresses (bounty_id, address) values (stored.id, detail);
      end if;
      insert into public.bounty_events (bounty_id, kind, actor_id, to_status)
      values (stored.id, 'published', uid, 'open');
      charged := public.spend_post(uid, 'bounty', stored.id);
      return jsonb_build_object('id', stored.id, 'status', 'open', 'charge', charged, 'expiresAt', stored.expires_at);
    end if;
    select * into stored from public.bounties b where b.id = publish_bounty.id;
  end if;
  if stored.poster_id is distinct from uid then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  if stored.title is distinct from btrim(publish_bounty.title)
    or stored.category is distinct from publish_bounty.category
    or stored.reward_minor is distinct from publish_bounty.reward_minor
    or stored.reward_currency is distinct from publish_bounty.reward_currency
    or stored.description is distinct from nullif(btrim(publish_bounty.description), '')
    or stored.place_label is distinct from label
    or extensions.st_astext(stored.place) is distinct from extensions.st_astext(
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    )
    or (select a.address from public.bounty_addresses a where a.bounty_id = stored.id) is distinct from detail
    or stored.starts_at is distinct from publish_bounty.starts_at
    or stored.ends_at is distinct from publish_bounty.ends_at
    or stored.deadline_at is distinct from publish_bounty.deadline_at
    or stored.art is distinct from publish_bounty.art
  then
    raise exception 'post_already_sent' using errcode = '55000';
  end if;
  return jsonb_build_object(
    'id', stored.id,
    'status', stored.status,
    'charge', (select c.charge from public.post_charges c where c.item_kind = 'bounty' and c.item_id = stored.id),
    'expiresAt', stored.expires_at
  );
end;
$$;

revoke all on function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz, text
) to authenticated;

-- A payer reads the payee's methods only while the payment is unsettled, as payee_methods_select_payer allows.
create or replace function public.payment_detail(payment uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  p public.payments;
begin
  select * into p from public.payments where id = payment and uid in (payer_id, payee_id);
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'id', p.id,
    'art', private.bounty_art(p.item_kind, p.item_id),
    'amountMinor', p.amount_minor,
    'currency', p.currency,
    'rate', case when p.rate_base is not null then jsonb_build_object(
      'base', p.rate_base,
      'quote', p.rate_quote,
      'quotePerBase', p.rate_quote_per_base,
      'date', p.rate_date,
      'source', p.rate_source
    ) end,
    'paidMinor', p.paid_minor,
    'paidCurrency', p.paid_currency,
    'methods', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'method', m.id,
        'type', m.type,
        'currency', c.code,
        'amountMinor', private.convert_minor(
          p.amount_minor, p.currency, c.code, p.rate_base, p.rate_quote, p.rate_quote_per_base
        )
      ) order by m.created_at, m.id), '[]'::jsonb)
      from public.payee_methods m
      cross join lateral (select public.method_currency(m.type, p.currency) as code) c
      where m.user_id = p.payee_id and (uid = p.payee_id or p.state <> 'settled')
    )
  );
end;
$$;

revoke all on function public.payment_detail(uuid) from public, anon;
grant execute on function public.payment_detail(uuid) to authenticated;

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

create or replace function public.nearby_bounties(
  latitude double precision default null,
  longitude double precision default null,
  board_filter text default 'all',
  page_after jsonb default null,
  page_size integer default 20,
  reference_currency text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set extra_float_digits = 3
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
  busy tstzmultirange := '{}';
  after_kind text;
  after_distance double precision;
  after_at timestamptz;
  after_id uuid;
  cursor_latitude double precision;
  cursor_longitude double precision;
  fetch_size integer;
  near_ids uuid[];
  near_distances double precision[];
  located uuid[] := '{}';
  recent uuid[] := '{}';
  page uuid[];
  last_item record;
  next_cursor jsonb;
  total jsonb;
  beyond_total jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if (latitude is null) <> (longitude is null)
    or latitude not between -90 and 90
    or longitude not between -180 and 180
    or board_filter is null
    or board_filter not in ('all', 'urgent', 'fits_my_time')
    or page_size is null
    or page_size not between 1 and 50
    or (page_after is not null and jsonb_typeof(page_after) not in ('object', 'null'))
  then
    raise exception 'invalid_board_query' using errcode = '22023';
  end if;
  if latitude is not null then
    here := extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography;
  end if;
  if jsonb_typeof(page_after) = 'object' then
    after_kind := page_after ->> 'kind';
    if after_kind is null
      or after_kind not in ('distance', 'recent')
      or (page_after ? 'createdAt') <> (after_kind = 'recent')
      or exists (
        select 1 from jsonb_object_keys(page_after) as k
        where k not in ('kind', 'id', 'createdAt', 'latitude', 'longitude', 'filter')
      )
    then
      raise exception 'invalid_board_query' using errcode = '22023';
    end if;
    begin
      after_id := (page_after ->> 'id')::uuid;
      after_at := (page_after ->> 'createdAt')::timestamptz;
      cursor_latitude := (page_after ->> 'latitude')::double precision;
      cursor_longitude := (page_after ->> 'longitude')::double precision;
    exception when others then
      raise exception 'invalid_board_query' using errcode = '22023';
    end;
    if after_id is null or (after_kind = 'recent' and not coalesce(isfinite(after_at), false)) then
      raise exception 'invalid_board_query' using errcode = '22023';
    end if;
    if cursor_latitude is distinct from latitude
      or cursor_longitude is distinct from longitude
      or page_after ->> 'filter' is distinct from board_filter
    then
      raise exception 'board_cursor_mismatch' using errcode = '22023';
    end if;
    if after_kind = 'distance' then
      if here is null then
        raise exception 'invalid_board_query' using errcode = '22023';
      end if;
      select b.place_public operator(extensions.<->) here into after_distance
      from public.bounties b
      where b.id = after_id
        and b.status = 'open'
        and b.place_public is not null
        and not private.is_blocked_between(uid, b.poster_id);
      if after_distance is null then
        raise exception 'board_cursor_mismatch' using errcode = '22023';
      end if;
    end if;
  end if;

  if board_filter = 'fits_my_time' then
    select coalesce(range_agg(private.bounty_slot(b.starts_at, b.ends_at)), '{}') into busy
    from public.bounties b
    where (b.poster_id = uid or b.helper_id = uid)
      and b.status in ('assigned', 'en_route', 'done', 'disputed')
      and b.starts_at is not null;
  end if;

  if after_kind is null then
    -- 2000 m is the client's AXIS_RANGE_M, compared on the same rounded distance the rows carry.
    select to_jsonb(count(*)),
      case when here is not null
        then to_jsonb(count(*) filter (where private.rounded_distance(b.place_public, here) > 2000))
      end
    into total, beyond_total
    from public.bounties b
    where b.status = 'open'
      and b.expires_at > now()
      and b.poster_id <> uid
      and not private.is_blocked_between(uid, b.poster_id)
      and (board_filter <> 'urgent' or (b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours'))
      and (board_filter <> 'fits_my_time' or not coalesce(private.bounty_slot(b.starts_at, b.ends_at) && busy, false));
  end if;

  if here is not null and after_at is null then
    fetch_size := page_size + 1;
    -- The GiST KNN scan is only planned when the order is the distance alone, so ties at the page boundary are
    -- fetched by widening the limit and then ordered by (distance, id) here.
    loop
      select coalesce(array_agg(q.id order by q.distance), '{}'), coalesce(array_agg(q.distance order by q.distance), '{}')
      into near_ids, near_distances
      from (
        select b.id, b.place_public operator(extensions.<->) here as distance
        from public.bounties b
        where b.status = 'open'
          and b.place_public is not null
          and b.expires_at > now()
          and b.poster_id <> uid
          and not private.is_blocked_between(uid, b.poster_id)
          and (board_filter <> 'urgent' or (b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours'))
          and (board_filter <> 'fits_my_time' or not coalesce(private.bounty_slot(b.starts_at, b.ends_at) && busy, false))
          and (
            after_distance is null
            or (b.place_public operator(extensions.<->) here, b.id) > (after_distance, after_id)
          )
        order by b.place_public operator(extensions.<->) here
        limit fetch_size
      ) q;
      exit when cardinality(near_ids) < fetch_size
        or near_distances[fetch_size] > near_distances[page_size + 1];
      fetch_size := fetch_size * 2;
    end loop;
    select coalesce(array_agg(f.id order by f.distance, f.id), '{}') into located
    from (
      select u.id, u.distance
      from unnest(near_ids, near_distances) as u(id, distance)
      where cardinality(near_ids) <= page_size or u.distance <= near_distances[page_size + 1]
      order by u.distance, u.id
      limit page_size + 1
    ) f;
  end if;

  if cardinality(located) <= page_size then
    select coalesce(array_agg(q.id order by q.created_at desc, q.id desc), '{}') into recent
    from (
      select b.id, b.created_at
      from public.bounties b
      where b.status = 'open'
        and (here is null or b.place_public is null)
        and b.expires_at > now()
        and b.poster_id <> uid
        and not private.is_blocked_between(uid, b.poster_id)
        and (board_filter <> 'urgent' or (b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours'))
        and (board_filter <> 'fits_my_time' or not coalesce(private.bounty_slot(b.starts_at, b.ends_at) && busy, false))
        and (after_at is null or (b.created_at, b.id) < (after_at, after_id))
      order by b.created_at desc, b.id desc
      limit page_size + 1 - cardinality(located)
    ) q;
  end if;

  page := located || recent;
  if cardinality(page) > page_size then
    page := page[1:page_size];
    select b.id, b.created_at, b.place_public is not null and here is not null as by_distance
    into last_item
    from public.bounties b
    where b.id = page[page_size];
    next_cursor := case when last_item.by_distance
      then jsonb_build_object('kind', 'distance', 'id', last_item.id)
      else jsonb_build_object('kind', 'recent', 'createdAt', last_item.created_at, 'id', last_item.id)
    end || jsonb_build_object('latitude', latitude, 'longitude', longitude, 'filter', board_filter);
  end if;

  return jsonb_build_object(
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'category', b.category,
        'art', b.art,
        'rewardMinor', b.reward_minor,
        'rewardCurrency', b.reward_currency,
        'reference', private.reference_money(b.reward_minor, b.reward_currency, reference_currency),
        'placeLabel', b.place_label,
        'stickerPath', b.sticker_path,
        'startsAt', b.starts_at,
        'endsAt', b.ends_at,
        'deadlineAt', b.deadline_at,
        'urgent', coalesce(b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours', false),
        'distanceM', private.rounded_distance(b.place_public, here),
        'point', case when b.place_public is not null then jsonb_build_object(
          'latitude', extensions.st_y(b.place_public::extensions.geometry),
          'longitude', extensions.st_x(b.place_public::extensions.geometry)
        ) end,
        'appliedByMe', exists (
          select 1 from public.bounty_applications a
          where a.bounty_id = b.id and a.applicant_id = uid and a.status = 'pending'
        ),
        'createdAt', b.created_at,
        'poster', private.bounty_person(b.poster_id)
      ) order by p.n), '[]')
      from unnest(page) with ordinality as p(id, n)
      join public.bounties b on b.id = p.id
    ),
    'next', next_cursor
  ) || jsonb_strip_nulls(jsonb_build_object('total', total, 'beyondTotal', beyond_total));
end;
$$;

revoke all on function public.nearby_bounties(double precision, double precision, text, jsonb, integer, text)
  from public, anon, authenticated;
grant execute on function public.nearby_bounties(double precision, double precision, text, jsonb, integer, text)
  to authenticated;

-- The counterpart's name is read live, so a deleted account (its payment party set null) reads as no name.
create or replace function public.sticker_book() returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'paymentId', s.payment_id,
    'role', s.role,
    'itemKind', s.item_kind,
    'category', s.category,
    'art', private.bounty_art(s.item_kind, p.item_id),
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name
  )
  from public.stickers s
  join public.payments p on p.id = s.payment_id
  left join public.profiles pr
    on pr.id = case when s.role = 'payee' then p.payer_id else p.payee_id end
  where s.owner_id = (select auth.uid())
  order by s.earned_at desc, s.id desc;
$$;

create or replace function public.settled_cards() returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  update public.stickers
  set collected_at = now()
  where owner_id = uid and role = 'payer' and collected_at is null and earned_at <= now() - interval '7 days';
  return query
  select jsonb_build_object(
    'stickerId', s.id,
    'paymentId', s.payment_id,
    'itemKind', s.item_kind,
    'category', s.category,
    'art', private.bounty_art(s.item_kind, p.item_id),
    'title', s.title,
    'earnedAt', s.earned_at,
    'counterpartName', pr.display_name,
    'amount', jsonb_build_object('minor', p.paid_minor, 'currency', p.paid_currency)
  )
  from public.stickers s
  join public.payments p on p.id = s.payment_id
  left join public.profiles pr on pr.id = p.payee_id
  where s.owner_id = uid and s.role = 'payer' and s.collected_at is null and s.earned_at > now() - interval '7 days'
  order by s.earned_at desc, s.id desc;
end;
$$;

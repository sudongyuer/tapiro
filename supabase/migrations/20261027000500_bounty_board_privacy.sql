alter table public.bounties add column place_public extensions.geography(Point, 4326)
  generated always as (extensions.st_snaptogrid(place::extensions.geometry, 0.001)::extensions.geography) stored;

create index bounties_place_public on public.bounties using gist (place_public) where status = 'open';
drop index public.bounties_place;

revoke select on public.bounties from authenticated;
grant select (id, poster_id, helper_id, title, description, category, reward_sen, place_label, starts_at, ends_at,
  deadline_at, published_at, expires_at, sticker_path, status, payment_timing, gate, eta_at, previous_eta_at, done_at,
  status_changed_at, created_at, updated_at) on public.bounties to authenticated;

create function private.rounded_distance(place extensions.geography, here extensions.geography) returns integer
language sql
immutable
set search_path = ''
as $$
  select case when place is not null and here is not null
    then greatest(100, round((place operator(extensions.<->) here) / 100) * 100)::integer
  end;
$$;

revoke all on function private.rounded_distance(extensions.geography, extensions.geography)
  from public, anon, authenticated;

create or replace function public.nearby_bounties(
  latitude double precision default null,
  longitude double precision default null,
  board_filter text default 'all',
  page_after jsonb default null,
  page_size integer default 20
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
      where b.id = after_id and b.place_public is not null and not private.is_blocked_between(uid, b.poster_id);
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
    select to_jsonb(count(*)) into total
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
        'rewardSen', b.reward_sen,
        'placeLabel', b.place_label,
        'stickerPath', b.sticker_path,
        'startsAt', b.starts_at,
        'endsAt', b.ends_at,
        'deadlineAt', b.deadline_at,
        'urgent', coalesce(b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours', false),
        'distanceM', private.rounded_distance(b.place_public, here),
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
  ) || case when total is not null then jsonb_build_object('total', total) else '{}' end;
end;
$$;

revoke all on function public.nearby_bounties(double precision, double precision, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.nearby_bounties(double precision, double precision, text, jsonb, integer)
  to authenticated;

drop function public.bounty_detail(uuid);

create function public.bounty_detail(
  bounty uuid,
  latitude double precision default null,
  longitude double precision default null
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
    'rewardSen', b.reward_sen,
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

revoke all on function public.bounty_detail(uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function public.bounty_detail(uuid, double precision, double precision) to authenticated;

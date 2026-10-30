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

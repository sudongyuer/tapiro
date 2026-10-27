create index bounties_open_recent on public.bounties (created_at desc, id desc) where status = 'open';

create function private.bounty_slot(starts_at timestamptz, ends_at timestamptz) returns tstzrange
language sql
immutable
set search_path = ''
as $$
  select case when starts_at is not null
    then tstzrange(starts_at, coalesce(ends_at, starts_at + interval '1 hour'))
  end;
$$;

revoke all on function private.bounty_slot(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function private.bounty_slot(timestamptz, timestamptz) to authenticated, service_role;

create function public.nearby_bounties(
  latitude double precision default null,
  longitude double precision default null,
  board_filter text default 'all',
  page_after jsonb default null,
  page_size integer default 20
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
set extra_float_digits = 3
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
  busy tstzmultirange := '{}';
  after_distance double precision;
  after_at timestamptz;
  after_id uuid;
  fetch_size integer;
  near_ids uuid[];
  near_distances double precision[];
  located uuid[] := '{}';
  recent uuid[] := '{}';
  page uuid[];
  last_item record;
  next_cursor jsonb;
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
    begin
      after_id := (page_after ->> 'id')::uuid;
      after_distance := (page_after ->> 'distance')::double precision;
      after_at := (page_after ->> 'createdAt')::timestamptz;
    exception when others then
      raise exception 'invalid_board_query' using errcode = '22023';
    end;
    if after_id is null
      or (after_distance is null) = (after_at is null)
      or (after_distance is not null and here is null)
    then
      raise exception 'invalid_board_query' using errcode = '22023';
    end if;
  end if;

  if board_filter = 'fits_my_time' then
    select coalesce(range_agg(private.bounty_slot(b.starts_at, b.ends_at)), '{}') into busy
    from public.bounties b
    where (b.poster_id = uid or b.helper_id = uid)
      and b.status in ('assigned', 'en_route', 'done', 'disputed')
      and b.starts_at is not null;
  end if;

  if here is not null and after_at is null then
    fetch_size := page_size + 1;
    -- The GiST KNN scan is only planned when the order is the distance alone, so ties at the page boundary are
    -- fetched by widening the limit and then ordered by (distance, id) here.
    loop
      select coalesce(array_agg(q.id order by q.distance), '{}'), coalesce(array_agg(q.distance order by q.distance), '{}')
      into near_ids, near_distances
      from (
        select b.id, b.place operator(extensions.<->) here as distance
        from public.bounties b
        where b.status = 'open'
          and b.place is not null
          and b.expires_at > now()
          and b.poster_id <> uid
          and not private.is_blocked_between(uid, b.poster_id)
          and (board_filter <> 'urgent' or (b.deadline_at > now() and b.deadline_at <= now() + interval '3 hours'))
          and (board_filter <> 'fits_my_time' or not coalesce(private.bounty_slot(b.starts_at, b.ends_at) && busy, false))
          and (
            after_distance is null
            or (b.place operator(extensions.<->) here, b.id) > (after_distance, after_id)
          )
        order by b.place operator(extensions.<->) here
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
        and (here is null or b.place is null)
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
    select b.id, b.created_at, b.place is not null and here is not null as by_distance,
      b.place operator(extensions.<->) here as distance
    into last_item
    from public.bounties b
    where b.id = page[page_size];
    next_cursor := case when last_item.by_distance
      then jsonb_build_object('distance', last_item.distance::text, 'id', last_item.id)
      else jsonb_build_object('createdAt', last_item.created_at, 'id', last_item.id)
    end;
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
        'distanceM', round(b.place operator(extensions.<->) here)::integer,
        'appliedByMe', exists (
          select 1 from public.bounty_applications a
          where a.bounty_id = b.id and a.applicant_id = uid and a.status = 'pending'
        ),
        'createdAt', b.created_at
      ) order by p.n), '[]')
      from unnest(page) with ordinality as p(id, n)
      join public.bounties b on b.id = p.id
    ),
    'next', next_cursor
  );
end;
$$;

revoke all on function public.nearby_bounties(double precision, double precision, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.nearby_bounties(double precision, double precision, text, jsonb, integer)
  to authenticated;

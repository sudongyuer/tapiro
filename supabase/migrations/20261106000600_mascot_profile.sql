create function public.mascot_level(stickers integer) returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when stickers >= 25 then 5 + (stickers - 25) / 15
    when stickers >= 15 then 4
    when stickers >= 8 then 3
    when stickers >= 3 then 2
    else 1
  end;
$$;

revoke all on function public.mascot_level(integer) from public, anon;
grant execute on function public.mascot_level(integer) to authenticated, service_role;

create function private.mascot_level_at(level integer) returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when level <= 1 then 0
    when level = 2 then 3
    when level = 3 then 8
    when level = 4 then 15
    else 25 + 15 * (level - 5)
  end;
$$;

revoke all on function private.mascot_level_at(integer) from public, anon, authenticated;

create type public.mascot_accessory as enum ('red_hat', 'backpack', 'umbrella', 'scarf');

create function private.accessory_level(a public.mascot_accessory) returns integer
language sql
immutable
set search_path = ''
as $$
  select case a when 'red_hat' then 2 when 'backpack' then 3 when 'umbrella' then 4 else 5 end;
$$;

revoke all on function private.accessory_level(public.mascot_accessory) from public, anon, authenticated;

create table public.mascot_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_level integer not null default 1 check (seen_level >= 1),
  accessory public.mascot_accessory,
  updated_at timestamptz not null default now()
);

create trigger mascot_progress_set_updated_at
  before update on public.mascot_progress
  for each row execute function public.set_updated_at();

alter table public.mascot_progress enable row level security;
revoke all on public.mascot_progress from anon, authenticated;

-- People who already hold stickers have no level-up moment to catch up on; only levels reached from now on play it.
insert into public.mascot_progress (user_id, seen_level)
select p.id, public.mascot_level((select count(*)::integer from public.stickers s where s.owner_id = p.id))
from public.profiles p
on conflict (user_id) do nothing;

create function private.mascot_json(uid uuid, with_private boolean) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with counted as (
    select count(*)::integer as stickers from public.stickers s where s.owner_id = uid
  ),
  levelled as (
    select c.stickers, public.mascot_level(c.stickers) as level,
      coalesce(m.seen_level, 1) as seen_level, m.accessory as chosen
    from counted c
    left join public.mascot_progress m on m.user_id = uid
  ),
  worn as (
    select l.*,
      case
        when l.chosen is not null and private.accessory_level(l.chosen) <= l.level then l.chosen
        else (
          select a from unnest(enum_range(null::public.mascot_accessory)) a
          where private.accessory_level(a) <= l.level
          order by private.accessory_level(a) desc
          limit 1
        )
      end as accessory
    from levelled l
  )
  select jsonb_build_object('level', w.level, 'stickers', w.stickers, 'accessory', w.accessory)
    || case when with_private then jsonb_build_object(
      'seenLevel', w.seen_level,
      'levelUp', w.level > w.seen_level,
      'nextLevelAt', private.mascot_level_at(w.level + 1),
      'chosenAccessory', w.chosen,
      'unlocked', coalesce((
        select jsonb_agg(a order by private.accessory_level(a))
        from unnest(enum_range(null::public.mascot_accessory)) a
        where private.accessory_level(a) <= w.level
      ), '[]'::jsonb)
    ) else '{}'::jsonb end
  from worn w;
$$;

revoke all on function private.mascot_json(uuid, boolean) from public, anon, authenticated;

create function public.my_mascot() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.mascot_json((select auth.uid()), true) where (select auth.uid()) is not null;
$$;

revoke all on function public.my_mascot() from public, anon;
grant execute on function public.my_mascot() to authenticated;

create function public.mark_level_seen(level integer) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_level integer;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  current_level := public.mascot_level((select count(*)::integer from public.stickers s where s.owner_id = uid));
  insert into public.mascot_progress as m (user_id, seen_level)
  values (uid, greatest(1, least(level, current_level)))
  on conflict (user_id) do update set seen_level = greatest(m.seen_level, excluded.seen_level);
  return private.mascot_json(uid, true);
end;
$$;

revoke all on function public.mark_level_seen(integer) from public, anon;
grant execute on function public.mark_level_seen(integer) to authenticated;

create function public.set_mascot_accessory(accessory public.mascot_accessory) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if accessory is not null and private.accessory_level(accessory) > public.mascot_level(
    (select count(*)::integer from public.stickers s where s.owner_id = uid)
  ) then
    raise exception 'accessory_locked' using errcode = '55000';
  end if;
  insert into public.mascot_progress as m (user_id, accessory)
  values (uid, set_mascot_accessory.accessory)
  on conflict (user_id) do update set accessory = excluded.accessory;
  return private.mascot_json(uid, true);
end;
$$;

revoke all on function public.set_mascot_accessory(public.mascot_accessory) from public, anon;
grant execute on function public.set_mascot_accessory(public.mascot_accessory) to authenticated;

-- Ride routes stay off public profiles: a ride's short names can point at someone's home (privacy, owner question).
create function private.public_review_json(v public.reviews) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.review_json(v) || jsonb_build_object(
    'kind', v.item_kind,
    'role', v.reviewee_role,
    'title', case when v.item_kind = 'bounty' then private.item_title(v.item_kind, v.item_id) end,
    'reviewer', private.person_json(v.reviewer_id)
  );
$$;

revoke all on function private.public_review_json(public.reviews) from public, anon, authenticated;

create function public.profile_card(person uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  p public.profiles;
  lifetime_settled integer;
  helped integer;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into p from public.profiles x where x.id = person;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  select count(*)::integer into lifetime_settled
  from public.reputation_events e where e.user_id = person and e.kind = 'settled';
  select (
    count(distinct e.counterpart_id)
      + coalesce(bool_or(e.counterpart_id is null), false)::integer
  )::integer into helped
  from public.reputation_events e
  join public.payments pay on pay.id = e.payment_id
  where e.user_id = person and e.kind = 'settled' and pay.payee_id = person;
  return jsonb_build_object(
    'id', p.id,
    'name', p.display_name,
    'avatarUrl', p.avatar_url,
    'joinedAt', p.created_at,
    'self', person = uid,
    'blockedByMe', exists (select 1 from public.blocks b where b.blocker_id = uid and b.blocked_id = person),
    'tier', public.reputation_tier(person),
    'helped', helped,
    'settled', lifetime_settled,
    'completionRate', case when lifetime_settled >= 5 then (
      select s.completion_rate from public.reputation_snapshots s where s.user_id = person
    ) end,
    'reviewCount', (
      select count(*) from public.reviews v where v.reviewee_id = person and v.shown_at <= now()
    ),
    'faces', (
      select jsonb_build_object(
        'happy', count(*) filter (where v.face = 'happy'),
        'okay', count(*) filter (where v.face = 'okay'),
        'unhappy', count(*) filter (where v.face = 'unhappy')
      )
      from public.reviews v where v.reviewee_id = person and v.shown_at <= now()
    ),
    'latestReviews', coalesce((
      select jsonb_agg(private.public_review_json(v) order by v.shown_at desc, v.id desc)
      from (
        select * from public.reviews r
        where r.reviewee_id = person and r.shown_at <= now()
        order by r.shown_at desc, r.id desc
        limit 3
      ) v
    ), '[]'::jsonb),
    'mascot', private.mascot_json(person, false)
  );
end;
$$;

revoke all on function public.profile_card(uuid) from public, anon;
grant execute on function public.profile_card(uuid) to authenticated;

create function public.profile_reviews(person uuid, before text default null, max_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cursor_at timestamptz;
  cursor_id uuid;
  page_size integer := least(greatest(coalesce(max_count, 20), 1), 50);
  result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if before is not null then
    begin
      cursor_at := split_part(before, '|', 1)::timestamptz;
      cursor_id := split_part(before, '|', 2)::uuid;
    exception when others then
      raise exception 'invalid_cursor' using errcode = '22023';
    end;
  end if;
  with page as (
    select r as v, row_number() over (order by r.shown_at desc, r.id desc) as n
    from public.reviews r
    where r.reviewee_id = person and r.shown_at <= now()
      and (before is null or (r.shown_at, r.id) < (cursor_at, cursor_id))
    order by r.shown_at desc, r.id desc
    limit page_size + 1
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(private.public_review_json(page.v) order by page.n) filter (where page.n <= page_size),
      '[]'::jsonb),
    'hasMore', count(*) > page_size,
    'nextCursor', case when count(*) > page_size then
      max((page.v).shown_at::text || '|' || (page.v).id::text) filter (where page.n = page_size)
    end
  ) into result
  from page;
  return result;
end;
$$;

revoke all on function public.profile_reviews(uuid, text, integer) from public, anon;
grant execute on function public.profile_reviews(uuid, text, integer) to authenticated;

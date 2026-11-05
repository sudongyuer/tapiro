-- Each member says whether the caller blocked them, never whether they blocked the caller: the blocked side is not
-- told (chat 123 A). A ride member also says whether they organise the ride, since a block between the organiser and
-- a member before 出发 ends that membership (20261102000800) and the confirmation has to say so.
create or replace function private.thread_json(t public.threads) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'kind', case when t.bounty_id is not null then 'bounty' else 'ride' end,
    'itemId', coalesce(t.bounty_id, t.ride_id),
    'item', case
      when t.bounty_id is not null then (
        select jsonb_build_object('title', b.title, 'category', b.category, 'art', b.art, 'status', private.bounty_status(b))
        from public.bounties b where b.id = t.bounty_id
      )
      else (
        select jsonb_build_object(
          'from', r.start_short, 'to', r.dest_short, 'departsAt', private.ride_departs_at(r), 'status', private.ride_phase(r)
        )
        from public.rides r where r.id = t.ride_id
      )
    end,
    'createdAt', t.created_at,
    'left', private.thread_visible_until(t.id) <> 'infinity'::timestamptz,
    'unread', private.thread_unread(t.id),
    'lastReadAt', (
      select m.last_read_at from public.thread_members m
      where m.thread_id = t.id and m.member_id = (select auth.uid())
    ),
    'peerReadAt', case when t.bounty_id is not null then (
      select max(m.last_read_at) from public.thread_members m
      where m.thread_id = t.id and m.member_id <> (select auth.uid()) and m.left_at is null
        and private.thread_visible_until(t.id) = 'infinity'::timestamptz
        and not private.is_blocked_between((select auth.uid()), m.member_id)
    ) end,
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.member_id, 'name', p.display_name, 'avatarUrl', p.avatar_url, 'left', m.left_at is not null,
          'blockedByMe', exists (
            select 1 from public.blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = m.member_id
          ),
          'organiser', t.ride_id is not null and m.member_id = (select r.organiser_id from public.rides r where r.id = t.ride_id)
        )
        order by m.joined_at, m.member_id
      )
      from public.thread_members m
      left join public.profiles p on p.id = m.member_id
      where m.thread_id = t.id and m.member_id <> (select auth.uid())
        and m.joined_at <= private.thread_visible_until(t.id)
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.thread_json(public.threads) from public, anon, authenticated;

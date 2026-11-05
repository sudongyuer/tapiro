alter table public.thread_members add column last_read_at timestamptz;

-- Read receipts are shown in bounty threads only (125 B), so a ride member must not read a co-member's last_read_at
-- straight from the table.
revoke select on public.thread_members from authenticated;
grant select (thread_id, member_id, joined_at, left_at) on public.thread_members to authenticated;

insert into private.event_kinds (kind, push) values ('chat.read', false);

create function private.thread_unread(thread uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.thread_members m
    join public.messages x on x.thread_id = m.thread_id
    where m.thread_id = thread and m.member_id = (select auth.uid())
      and x.sender_id <> m.member_id
      and x.created_at > coalesce(m.last_read_at, '-infinity'::timestamptz)
      and x.created_at <= coalesce(m.left_at, 'infinity'::timestamptz)
      and not private.is_blocked_between(m.member_id, x.sender_id)
  );
$$;

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
          'id', m.member_id, 'name', p.display_name, 'avatarUrl', p.avatar_url, 'left', m.left_at is not null
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

-- Marks read up to a message the client has shown, not up to now(): a message stored after the screen loaded stays
-- unread until it is shown.
create function public.mark_read(thread uuid, message uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  until timestamptz;
  shown timestamptz;
  previous timestamptz;
  t public.threads;
begin
  select coalesce(m.left_at, 'infinity'::timestamptz), m.last_read_at into until, previous
  from public.thread_members m
  where m.thread_id = thread and m.member_id = uid
  for update;
  if until is null then
    raise exception 'thread_not_found' using errcode = 'P0002';
  end if;
  select x.created_at into shown from public.messages x
  where x.id = message and x.thread_id = thread and x.created_at <= until;
  if shown is null then
    raise exception 'message_not_found' using errcode = 'P0002';
  end if;
  if previous is not null and previous >= shown then
    return jsonb_build_object('lastReadAt', previous);
  end if;
  update public.thread_members m set last_read_at = shown
  where m.thread_id = thread and m.member_id = uid;
  select * into t from public.threads x where x.id = thread;
  if t.bounty_id is not null and until = 'infinity'::timestamptz then
    perform private.emit_event(
      coalesce((
        select array_agg(m.member_id) from public.thread_members m
        where m.thread_id = thread and m.left_at is null and not private.is_blocked_between(uid, m.member_id)
      ), '{}'),
      'chat.read', thread, uid
    );
  end if;
  return jsonb_build_object('lastReadAt', shown);
end;
$$;

create function public.unread_threads() returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.thread_members m
  where m.member_id = (select auth.uid()) and private.thread_unread(m.thread_id);
$$;

revoke all on function private.thread_unread(uuid) from public, anon, authenticated;
revoke all on function private.thread_json(public.threads) from public, anon, authenticated;
revoke all on function public.mark_read(uuid, uuid) from public, anon, authenticated;
revoke all on function public.unread_threads() from public, anon, authenticated;
grant execute on function public.mark_read(uuid, uuid) to authenticated;
grant execute on function public.unread_threads() to authenticated;

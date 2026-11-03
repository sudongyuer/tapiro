create table public.threads (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid unique references public.bounties (id) on delete cascade,
  ride_id uuid unique references public.rides (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(bounty_id, ride_id) = 1)
);

create table public.thread_members (
  thread_id uuid not null references public.threads (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  left_at timestamptz,
  primary key (thread_id, member_id)
);

create index thread_members_member on public.thread_members (member_id, thread_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000 and body = btrim(body)),
  created_at timestamptz not null default clock_timestamp(),
  unique (sender_id, client_id)
);

create index messages_thread_created on public.messages (thread_id, created_at desc, id desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_id uuid references auth.users (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  thread_id uuid references public.threads (id) on delete set null,
  reason text check (reason in ('harassment', 'off_platform_payment', 'inappropriate', 'other')),
  note text check (char_length(note) between 1 and 500),
  message_body text,
  message_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);

create unique index reports_person_once on public.reports (reporter_id, target_id) where message_id is null;
create index reports_created on public.reports (created_at);

alter table public.threads enable row level security;
alter table public.thread_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

revoke all on public.threads, public.thread_members, public.messages, public.reports from public, anon, authenticated;
grant select on public.threads, public.thread_members, public.messages to authenticated;

create function private.thread_visible_until(thread uuid, uid uuid) returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(m.left_at, 'infinity'::timestamptz) from public.thread_members m
  where m.thread_id = thread and m.member_id = uid;
$$;

create policy threads_select_member on public.threads
  for select to authenticated
  using (private.thread_visible_until(id, (select auth.uid())) is not null);

create policy thread_members_select_member on public.thread_members
  for select to authenticated
  using (private.thread_visible_until(thread_id, (select auth.uid())) is not null);

create policy messages_select_member on public.messages
  for select to authenticated
  using (created_at <= private.thread_visible_until(thread_id, (select auth.uid())));

create function private.ensure_thread(bounty uuid, ride uuid, people uuid[]) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread uuid;
begin
  insert into public.threads (bounty_id, ride_id) values (bounty, ride) on conflict do nothing;
  select t.id into thread from public.threads t
  where t.bounty_id is not distinct from bounty and t.ride_id is not distinct from ride;
  insert into public.thread_members (thread_id, member_id)
  select thread, person from unnest(people) person where person is not null
  on conflict (thread_id, member_id) do update set left_at = null, joined_at = case
    when public.thread_members.left_at is null then public.thread_members.joined_at else clock_timestamp()
  end;
  return thread;
end;
$$;

create function private.bounty_thread_on_assign() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_thread(new.id, null, array[new.poster_id, new.helper_id]);
  return new;
end;
$$;

create trigger bounties_thread_on_assign
  after update of status on public.bounties
  for each row when (old.status = 'open' and new.status = 'assigned')
  execute function private.bounty_thread_on_assign();

create function private.ride_thread_membership() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organiser uuid := (select r.organiser_id from public.rides r where r.id = new.ride_id);
begin
  if new.status = 'accepted' and new.member_id <> organiser then
    perform private.ensure_thread(null, new.ride_id, array[organiser, new.member_id]);
  elsif new.status in ('left', 'withdrawn', 'declined') then
    update public.thread_members m set left_at = clock_timestamp()
    from public.threads t
    where t.ride_id = new.ride_id and m.thread_id = t.id and m.member_id = new.member_id and m.left_at is null;
  end if;
  return new;
end;
$$;

create trigger ride_members_thread_membership
  after update of status on public.ride_members
  for each row when (old.status is distinct from new.status)
  execute function private.ride_thread_membership();

select private.ensure_thread(b.id, null, array[b.poster_id, b.helper_id])
from public.bounties b
where b.helper_id is not null and b.status <> 'open'
order by b.id;

select private.ensure_thread(null, r.id, array[r.organiser_id] || array_agg(m.member_id order by m.member_id))
from public.rides r
join public.ride_members m on m.ride_id = r.id
where m.member_id <> r.organiser_id and m.status in ('accepted', 'boarded', 'no_show', 'appealed')
group by r.id, r.organiser_id
order by r.id;

create function private.message_json(m public.messages) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', m.id, 'threadId', m.thread_id, 'senderId', m.sender_id, 'clientId', m.client_id,
    'body', m.body, 'createdAt', m.created_at
  );
$$;

create function private.thread_json(t public.threads, uid uuid) returns jsonb
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
    'left', (select m.left_at is not null from public.thread_members m where m.thread_id = t.id and m.member_id = uid),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.member_id, 'name', p.display_name, 'avatarUrl', p.avatar_url, 'left', m.left_at is not null
        )
        order by m.joined_at, m.member_id
      )
      from public.thread_members m
      left join public.profiles p on p.id = m.member_id
      where m.thread_id = t.id and m.member_id <> uid
    ), '[]'::jsonb)
  );
$$;

create function public.list_threads() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select t, coalesce(m.left_at, 'infinity'::timestamptz) as until
    from public.thread_members m
    join public.threads t on t.id = m.thread_id
    where m.member_id = (select auth.uid())
  ),
  latest as (
    select mine.t, last.msg
    from mine
    left join lateral (
      select x as msg from public.messages x
      where x.thread_id = (mine.t).id and x.created_at <= mine.until
      order by x.created_at desc, x.id desc
      limit 1
    ) last on true
  )
  select jsonb_build_object('items', coalesce((
    select jsonb_agg(
      private.thread_json(latest.t, (select auth.uid()))
        || jsonb_build_object('lastMessage', case when (latest.msg).id is not null then private.message_json(latest.msg) end)
      order by coalesce((latest.msg).created_at, (latest.t).created_at) desc, (latest.t).id
    )
    from latest
  ), '[]'::jsonb));
$$;

create function public.read_thread(thread uuid, before uuid default null, max_count integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  until timestamptz := private.thread_visible_until(thread, uid);
  t public.threads;
  cursor_at timestamptz;
  cursor_id uuid;
  page jsonb;
  more boolean;
begin
  if until is null then
    raise exception 'thread_not_found' using errcode = 'P0002';
  end if;
  if max_count is null or max_count not between 1 and 100 then
    raise exception 'invalid_page' using errcode = '22023';
  end if;
  select * into t from public.threads x where x.id = thread;
  if before is not null then
    select x.created_at, x.id into cursor_at, cursor_id from public.messages x
    where x.id = before and x.thread_id = thread and x.created_at <= until;
    if not found then
      raise exception 'invalid_page' using errcode = '22023';
    end if;
  end if;
  with numbered as (
    select x, row_number() over (order by x.created_at desc, x.id desc) as n
    from public.messages x
    where x.thread_id = thread and x.created_at <= until
      and (cursor_at is null or (x.created_at, x.id) < (cursor_at, cursor_id))
    order by x.created_at desc, x.id desc
    limit max_count + 1
  )
  select
    coalesce(jsonb_agg(private.message_json(numbered.x) order by numbered.n) filter (where numbered.n <= max_count), '[]'::jsonb),
    count(*) > max_count
  into page, more
  from numbered;
  return jsonb_build_object('thread', private.thread_json(t, uid), 'messages', page, 'hasMore', more);
end;
$$;

-- In a bounty thread a block in either direction stops sending. In a ride group it does not (plan Rulings, group
-- block rule); the blocked pair only stops receiving each other's chat.message events.
create function public.send_message(thread uuid, client_id uuid, body text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned text := btrim(body);
  existing public.messages;
  t public.threads;
  stored public.messages;
begin
  if client_id is null or cleaned is null or char_length(cleaned) not between 1 and 2000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  select * into existing from public.messages m where m.sender_id = uid and m.client_id = send_message.client_id;
  if found then
    if existing.thread_id <> thread or existing.body is distinct from cleaned then
      raise exception 'client_id_reused' using errcode = '22023';
    end if;
    return private.message_json(existing);
  end if;
  if private.thread_visible_until(thread, uid) is null then
    raise exception 'thread_not_found' using errcode = 'P0002';
  end if;
  if private.thread_visible_until(thread, uid) <> 'infinity'::timestamptz then
    raise exception 'not_member' using errcode = '42501';
  end if;
  select * into t from public.threads x where x.id = thread for share;
  if t.bounty_id is not null and exists (
    select 1 from public.thread_members m
    where m.thread_id = thread and m.member_id <> uid and private.is_blocked_between(uid, m.member_id)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  insert into public.messages (thread_id, sender_id, client_id, body)
  values (thread, uid, send_message.client_id, cleaned)
  on conflict on constraint messages_sender_id_client_id_key do nothing
  returning * into stored;
  if stored.id is null then
    select * into existing from public.messages m where m.sender_id = uid and m.client_id = send_message.client_id;
    if existing.thread_id <> thread or existing.body is distinct from cleaned then
      raise exception 'client_id_reused' using errcode = '22023';
    end if;
    return private.message_json(existing);
  end if;
  perform private.emit_event(
    coalesce((
      select array_agg(m.member_id) from public.thread_members m
      where m.thread_id = thread and m.left_at is null and not private.is_blocked_between(uid, m.member_id)
    ), '{}'),
    'chat.message', thread, uid
  );
  return private.message_json(stored);
end;
$$;

create function public.report(
  target_user uuid,
  message uuid default null,
  reason text default null,
  note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned text := nullif(btrim(note), '');
  m public.messages;
  target uuid := target_user;
  stored uuid;
begin
  if reason is not null and reason not in ('harassment', 'off_platform_payment', 'inappropriate', 'other') then
    raise exception 'invalid_report' using errcode = '22023';
  end if;
  if char_length(cleaned) > 500 then
    raise exception 'invalid_report' using errcode = '22023';
  end if;
  if message is not null then
    select * into m from public.messages x where x.id = message;
    if not found or m.created_at > coalesce(private.thread_visible_until(m.thread_id, uid), '-infinity'::timestamptz) then
      raise exception 'message_not_found' using errcode = 'P0002';
    end if;
    if target is not null and target <> m.sender_id then
      raise exception 'invalid_report' using errcode = '22023';
    end if;
    target := m.sender_id;
  elsif target is null or not exists (select 1 from public.profiles p where p.id = target) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if target = uid then
    raise exception 'cannot_report_self' using errcode = '22023';
  end if;
  insert into public.reports (reporter_id, target_id, message_id, thread_id, reason, note, message_body, message_sent_at)
  values (uid, target, m.id, m.thread_id, reason, cleaned, m.body, m.created_at)
  on conflict do nothing
  returning id into stored;
  if stored is null then
    select r.id into stored from public.reports r
    where r.reporter_id = uid and r.target_id = target and r.message_id is not distinct from m.id;
  end if;
  return jsonb_build_object('id', stored);
end;
$$;

create view private.report_queue as
select
  r.id, r.created_at, r.reason, r.note,
  r.reporter_id, reporter.display_name as reporter_name,
  r.target_id, target.display_name as target_name,
  r.thread_id, t.bounty_id, t.ride_id,
  r.message_id, r.message_body, r.message_sent_at
from public.reports r
left join public.profiles reporter on reporter.id = r.reporter_id
left join public.profiles target on target.id = r.target_id
left join public.threads t on t.id = r.thread_id
order by r.created_at desc;

revoke all on private.report_queue from public, anon, authenticated;
grant select on private.report_queue to service_role;

insert into private.event_kinds (kind, push) values ('chat.message', true);

revoke all on function private.thread_visible_until(uuid, uuid) from public, anon;
grant execute on function private.thread_visible_until(uuid, uuid) to authenticated;
revoke all on function private.ensure_thread(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function private.bounty_thread_on_assign() from public, anon, authenticated;
revoke all on function private.ride_thread_membership() from public, anon, authenticated;
revoke all on function private.message_json(public.messages) from public, anon, authenticated;
revoke all on function private.thread_json(public.threads, uuid) from public, anon, authenticated;
revoke all on function public.list_threads() from public, anon, authenticated;
revoke all on function public.read_thread(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.send_message(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.report(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.list_threads() to authenticated;
grant execute on function public.read_thread(uuid, uuid, integer) to authenticated;
grant execute on function public.send_message(uuid, uuid, text) to authenticated;
grant execute on function public.report(uuid, uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 10485760, array['image/jpeg']);

alter table public.messages
  add column image_path text,
  add column image_width integer,
  add column image_height integer;

alter table public.messages drop constraint messages_body_check;

alter table public.messages
  add constraint messages_body_check check (
    body = regexp_replace(body, '^[\s ​﻿]+|[\s ​﻿]+$', '', 'g')
    and (char_length(body) between 1 and 2000 or (body = '' and image_path is not null))
  ),
  add constraint messages_image_check check (
    num_nulls(image_path, image_width, image_height) in (0, 3)
    and image_width between 1 and 4096
    and image_height between 1 and 4096
  ),
  -- The object name is derived from the sender's client id, so a retried upload lands on the same object and one
  -- message can never point at another member's upload.
  add constraint messages_image_path_check check (
    image_path = thread_id::text || '/' || sender_id::text || '/' || client_id::text || '.jpg'
  );

create unique index messages_image_path on public.messages (image_path) where image_path is not null;

alter table public.reports add column message_image_path text;

create index reports_message_image_path on public.reports (message_image_path) where message_image_path is not null;

create or replace function private.message_json(m public.messages) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', m.id, 'threadId', m.thread_id, 'senderId', m.sender_id, 'clientId', m.client_id,
    'body', m.body, 'createdAt', m.created_at,
    'image', case when m.image_path is not null then jsonb_build_object(
      'path', m.image_path, 'width', m.image_width, 'height', m.image_height
    ) end
  );
$$;

revoke all on function private.message_json(public.messages) from public, anon, authenticated;

-- Shared by send_message and the upload policy: the caller is an active member and, in a bounty thread, no block
-- stands between them and the other member.
create function private.can_post(thread uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.thread_members m
    where m.thread_id = thread and m.member_id = (select auth.uid()) and m.left_at is null
  ) and not exists (
    select 1 from public.threads t
    join public.thread_members other on other.thread_id = t.id and other.member_id <> (select auth.uid())
    where t.id = thread and t.bounty_id is not null and private.is_blocked_between((select auth.uid()), other.member_id)
  );
$$;

create function private.chat_image_writable(name text) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(name, '/');
  thread uuid;
begin
  if array_length(parts, 1) <> 3 or parts[2] is distinct from (select auth.uid())::text
     or parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' then
    return false;
  end if;
  begin
    thread := parts[1]::uuid;
  exception when others then
    return false;
  end;
  return parts[1] = thread::text and private.can_post(thread);
end;
$$;

revoke all on function private.can_post(uuid) from public, anon, authenticated;
revoke all on function private.chat_image_writable(text) from public, anon;
grant execute on function private.chat_image_writable(text) to authenticated;

create policy chat_images_insert_member on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-images' and private.chat_image_writable(name));

-- Reads follow the messages table's own RLS (members only, up to left_at), so an image is visible exactly when its
-- message is.
create policy chat_images_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-images'
    and exists (select 1 from public.messages m where m.image_path = storage.objects.name)
  );

drop function public.send_message(uuid, uuid, text);

-- In a bounty thread a block in either direction stops sending. In a ride group it does not (plan Rulings, group
-- block rule); the blocked pair only stops receiving each other's chat.message events. An image is uploaded first
-- under the path from the client id; a missing object answers image_missing, which the client may retry (the retry
-- uploads again).
create function public.send_message(
  thread uuid,
  client_id uuid,
  body text default '',
  image text default null,
  width integer default null,
  height integer default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned text := regexp_replace(coalesce(body, ''), '^[\s ​﻿]+|[\s ​﻿]+$', '', 'g');
  until timestamptz;
  existing public.messages;
  t public.threads;
  stored public.messages;
begin
  if client_id is null or char_length(cleaned) > 2000 or (image is null and cleaned = '') then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if image is not null and (
    image <> thread::text || '/' || uid::text || '/' || client_id::text || '.jpg'
    or width is null or height is null or width not between 1 and 4096 or height not between 1 and 4096
  ) then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if image is null and (width is not null or height is not null) then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  select * into existing from public.messages m where m.sender_id = uid and m.client_id = send_message.client_id;
  if found then
    if existing.thread_id <> thread or existing.body is distinct from cleaned
       or existing.image_path is distinct from image then
      raise exception 'client_id_reused' using errcode = '22023';
    end if;
    return private.message_json(existing);
  end if;
  select coalesce(m.left_at, 'infinity'::timestamptz) into until from public.thread_members m
  where m.thread_id = thread and m.member_id = uid
  for share;
  if until is null then
    raise exception 'thread_not_found' using errcode = 'P0002';
  end if;
  if until <> 'infinity'::timestamptz then
    raise exception 'not_member' using errcode = '42501';
  end if;
  select * into t from public.threads x where x.id = thread for share;
  if t.bounty_id is not null and not private.can_post(thread) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if image is not null and not exists (
    select 1 from storage.objects o where o.bucket_id = 'chat-images' and o.name = image
  ) then
    raise exception 'image_missing' using errcode = 'P0002';
  end if;
  insert into public.messages (thread_id, sender_id, client_id, body, image_path, image_width, image_height)
  values (thread, uid, send_message.client_id, cleaned, image, width, height)
  on conflict on constraint messages_sender_id_client_id_key do nothing
  returning * into stored;
  if stored.id is null then
    select * into existing from public.messages m where m.sender_id = uid and m.client_id = send_message.client_id;
    if existing.thread_id <> thread or existing.body is distinct from cleaned
       or existing.image_path is distinct from image then
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

revoke all on function public.send_message(uuid, uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.send_message(uuid, uuid, text, text, integer, integer) to authenticated;

create or replace function public.report(
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
    if not found or m.created_at > coalesce(private.thread_visible_until(m.thread_id), '-infinity'::timestamptz) then
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
  insert into public.reports (
    reporter_id, target_id, message_id, thread_id, reason, note, message_body, message_sent_at, message_image_path
  )
  values (uid, target, m.id, m.thread_id, reason, cleaned, nullif(m.body, ''), m.created_at, m.image_path)
  on conflict do nothing
  returning id into stored;
  if stored is null then
    select r.id into stored from public.reports r
    where r.reporter_id = uid and r.target_id = target and r.message_id is not distinct from m.id;
  end if;
  return jsonb_build_object('id', stored);
end;
$$;

create or replace view private.report_queue as
select
  r.id, r.created_at, r.reason, r.note,
  r.reporter_id, reporter.display_name as reporter_name,
  r.target_id, target.display_name as target_name,
  r.thread_id, t.bounty_id, t.ride_id,
  r.message_id, r.message_body, r.message_sent_at, r.message_image_path
from public.reports r
left join public.profiles reporter on reporter.id = r.reporter_id
left join public.profiles target on target.id = r.target_id
left join public.threads t on t.id = r.thread_id
order by r.created_at desc;

revoke all on private.report_queue from public, anon, authenticated;
grant select on private.report_queue to service_role;

create or replace function public.expire_report_snapshots() returns integer
language sql
security definer
set search_path = ''
as $$
  with cleared as (
    update public.reports r set message_body = null, message_sent_at = null, message_image_path = null
    where r.created_at < now() - interval '1 year'
      and (r.message_body is not null or r.message_sent_at is not null or r.message_image_path is not null)
    returning 1
  )
  select count(*)::integer from cleared;
$$;

revoke all on function public.expire_report_snapshots() from public, anon, authenticated;

-- Objects no message and no report snapshot points at: a deleted account's images (messages cascade), snapshots
-- past their year, and uploads whose message was never stored. The grace keeps an upload alive while its send is
-- still in flight; a later retry uploads again. Removed through the Storage API by payment-proof-cleanup, since
-- storage.objects refuses direct deletes.
create function public.chat_images_to_delete(grace interval default interval '1 day')
returns table (object_name text, thread_id uuid, clears_image boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, null::uuid, false
  from storage.objects o
  where o.bucket_id = 'chat-images'
    and o.created_at <= now() - grace
    and not exists (select 1 from public.messages m where m.image_path = o.name)
    and not exists (select 1 from public.reports r where r.message_image_path = o.name);
$$;

revoke all on function public.chat_images_to_delete(interval) from public, anon, authenticated;
grant execute on function public.chat_images_to_delete(interval) to service_role;

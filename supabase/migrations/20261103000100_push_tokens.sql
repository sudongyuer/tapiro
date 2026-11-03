create table public.push_tokens (
  token text primary key check (char_length(token) <= 200 and token ~ '^Expo(nent)?PushToken\[[^]]+\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null check (language in ('zh-Hans', 'en', 'ms')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user on public.push_tokens (user_id, updated_at desc);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from public, anon, authenticated;

create function public.register_push_token(token text, language text) returns void
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
  if language is null or language not in ('zh-Hans', 'en', 'ms') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  if token is null or char_length(token) > 200 or token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'invalid_push_token' using errcode = '22023';
  end if;
  insert into public.push_tokens as t (token, user_id, language)
  values (register_push_token.token, uid, register_push_token.language)
  on conflict on constraint push_tokens_pkey do update
    set user_id = excluded.user_id, language = excluded.language, updated_at = now();
  delete from public.push_tokens t
  where t.user_id = uid and t.token in (
    select x.token from public.push_tokens x where x.user_id = uid order by x.updated_at desc offset 10
  );
end;
$$;

create function public.set_push_language(language text) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  changed integer;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if language is null or language not in ('zh-Hans', 'en', 'ms') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  update public.push_tokens t set language = set_push_language.language, updated_at = now() where t.user_id = uid;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create function public.unregister_push_token(token text) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens t where t.token = unregister_push_token.token and t.user_id = (select auth.uid());
$$;

alter table public.push_recordings rename to push_queue;
alter table public.push_queue
  add column claimed_at timestamptz,
  add column attempts smallint not null default 0,
  add column sent_at timestamptz,
  add column failed_at timestamptz;
create index push_queue_due on public.push_queue (send_at) where sent_at is null and failed_at is null;

alter trigger events_record_push on public.events rename to events_queue_push;
alter function private.record_push() rename to queue_push;

create or replace function private.queue_push() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread text;
  on_ride boolean := false;
  held timestamptz := private.quiet_until(new.created_at);
begin
  if new.kind like 'ride.%' then
    thread := 'ride:' || new.subject_id;
    on_ride := exists (
      select 1 from public.rides r where r.id = new.subject_id and r.status in ('gathering', 'departed')
    );
  elsif new.kind like 'bounty.%' then
    thread := 'bounty:' || new.subject_id;
  else
    select p.item_kind::text || ':' || p.item_id into thread from public.payments p where p.id = new.subject_id;
  end if;
  insert into public.push_queue (event_id, recipient, kind, subject_id, thread_id, quiet, send_at)
  values (
    new.id, new.recipient, new.kind, new.subject_id, coalesce(thread, 'payment:' || new.subject_id),
    held is not null and not on_ride,
    case when held is not null and not on_ride then held else new.created_at end
  );
  return new;
end;
$$;

create table public.recorded_pushes (
  id bigint generated always as identity primary key,
  queue_id bigint not null references public.push_queue (id) on delete cascade,
  token text not null,
  language text not null,
  title text not null,
  body text not null,
  thread_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index recorded_pushes_queue on public.recorded_pushes (queue_id);

alter table public.recorded_pushes enable row level security;
revoke all on public.recorded_pushes from public, anon, authenticated;
grant select, insert on public.recorded_pushes to service_role;

create function private.push_subject(kind text, subject uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind like 'bounty.%' then (select jsonb_build_object('title', b.title) from public.bounties b where b.id = subject)
    when kind like 'ride.%' then (
      select jsonb_build_object('from', r.start_short, 'to', r.dest_short) from public.rides r where r.id = subject
    )
    else (select jsonb_build_object('title', p.title) from public.payments p where p.id = subject)
  end;
$$;

-- A claim older than five minutes belongs to a run that died before finish_push; it is claimed again, and the
-- attempt cap keeps that to one retry.
create function public.claim_due_pushes(max_rows integer default 100) returns jsonb
language sql
security definer
set search_path = ''
as $$
  with due as (
    select q.id from public.push_queue q
    where q.sent_at is null and q.failed_at is null and q.attempts < 2 and q.send_at <= now()
      and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
    order by q.send_at, q.id
    limit greatest(1, least(coalesce(max_rows, 100), 500))
    for update skip locked
  ),
  claimed as (
    update public.push_queue q set claimed_at = now(), attempts = q.attempts + 1
    from due where q.id = due.id
    returning q.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'queueId', c.id,
    'kind', c.kind,
    'subjectId', c.subject_id,
    'threadId', c.thread_id,
    'actorName', (select p.display_name from public.profiles p where p.id = e.actor_id),
    'subject', coalesce(private.push_subject(c.kind, c.subject_id), '{}'::jsonb),
    'tokens', coalesce((
      select jsonb_agg(jsonb_build_object('token', t.token, 'language', t.language) order by t.updated_at desc)
      from public.push_tokens t where t.user_id = c.recipient
    ), '[]'::jsonb)
  ) order by c.send_at, c.id), '[]'::jsonb)
  from claimed c
  join public.events e on e.id = c.event_id;
$$;

create function public.finish_push(queue_id bigint, error text default null) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.push_queue;
begin
  if error is null then
    update public.push_queue set sent_at = now() where id = queue_id returning * into q;
    return;
  end if;
  update public.push_queue
  set claimed_at = null, failed_at = case when attempts >= 2 then now() end
  where id = queue_id
  returning * into q;
  update public.events set push_error = left(error, 200) where id = q.event_id;
end;
$$;

create function public.drop_push_token(token text) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens t where t.token = drop_push_token.token;
$$;

create function private.poke_notify() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from added where added.send_at <= now()) then
    perform public.call_edge_function('notify');
  end if;
  return null;
end;
$$;

create trigger push_queue_poke
  after insert on public.push_queue
  referencing new table as added
  for each statement execute function private.poke_notify();

create function private.drain_due_pushes() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.push_queue q
    where q.sent_at is null and q.failed_at is null and q.attempts < 2 and q.send_at <= now()
  ) then
    perform public.call_edge_function('notify');
  end if;
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon, authenticated;
revoke all on function public.set_push_language(text) from public, anon, authenticated;
revoke all on function public.unregister_push_token(text) from public, anon, authenticated;
revoke all on function private.queue_push() from public, anon, authenticated;
revoke all on function private.push_subject(text, uuid) from public, anon, authenticated;
revoke all on function public.claim_due_pushes(integer) from public, anon, authenticated;
revoke all on function public.finish_push(bigint, text) from public, anon, authenticated;
revoke all on function public.drop_push_token(text) from public, anon, authenticated;
revoke all on function private.poke_notify() from public, anon, authenticated;
revoke all on function private.drain_due_pushes() from public, anon, authenticated;

grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.set_push_language(text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.claim_due_pushes(integer) to service_role;
grant execute on function public.finish_push(bigint, text) to service_role;
grant execute on function public.drop_push_token(text) to service_role;

select cron.schedule('push-drain', '*/5 * * * *', $$select private.drain_due_pushes()$$);

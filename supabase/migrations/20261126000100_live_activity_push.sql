-- The kit attaches each activity's update token natively with the device key: iOS wakes the app for a push-started
-- activity without a scene, so JavaScript never runs to do it.

create table public.live_activity_devices (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_token text unique check (char_length(start_token) <= 400 and start_token ~ '^[0-9a-f]{64,}$'),
  environment text not null check (environment in ('sandbox', 'production')),
  language text not null check (language in ('zh-Hans', 'en', 'ms')),
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  clock text not null check (clock in ('h23', 'h12')),
  updated_at timestamptz not null default now()
);

create index live_activity_devices_user on public.live_activity_devices (user_id, updated_at desc);

create table public.live_activity_tokens (
  token text primary key check (char_length(token) <= 400 and token ~ '^[0-9a-f]{64,}$'),
  device_id uuid not null references public.live_activity_devices (id) on delete cascade,
  link text not null check (link ~ '^tapiro://(bounty/status|ride)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  last_content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index live_activity_tokens_device on public.live_activity_tokens (device_id, updated_at desc);

create table public.live_activity_started (
  user_id uuid not null references auth.users (id) on delete cascade,
  link text not null,
  content jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, link)
);

create table public.live_activity_due (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null default 1,
  urgent boolean not null,
  due_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_version bigint,
  attempts smallint not null default 0
);

alter table public.live_activity_devices enable row level security;
alter table public.live_activity_tokens enable row level security;
alter table public.live_activity_started enable row level security;
alter table public.live_activity_due enable row level security;
revoke all on public.live_activity_devices from public, anon, authenticated;
revoke all on public.live_activity_tokens from public, anon, authenticated;
revoke all on public.live_activity_started from public, anon, authenticated;
revoke all on public.live_activity_due from public, anon, authenticated;

create function private.live_activity_key_hash(device_key text) returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if device_key is null or device_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_device_key' using errcode = '22023';
  end if;
  return encode(sha256(convert_to(device_key, 'UTF8')), 'hex');
end;
$$;

create function private.live_activity_subjects_for(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select uid
  ),
  bounties as (
    select jsonb_build_object(
      'kind', 'bounty',
      'id', b.id,
      'phase', case when b.status = 'en_route' then 'onTheWay' else 'arrived' end,
      'helper', private.bounty_person_name(b.helper_id),
      'place', b.place_label,
      'task', b.title,
      'leftAt', (
        select max(e.created_at) from public.bounty_events e where e.bounty_id = b.id and e.kind = 'started'
      ),
      'etaAt', case when b.status = 'en_route' then b.eta_at end,
      'arrivedAt', case when b.status <> 'en_route' then b.done_at end
    ) as subject
    from public.bounties b, me
    where b.poster_id = me.uid
      and not private.is_blocked_between(me.uid, b.helper_id)
      and (
        (b.status = 'en_route' and b.eta_at is not null)
        or (
          b.status in ('done', 'disputed', 'confirmed')
          and b.done_at > now() - interval '15 minutes'
          and exists (select 1 from public.bounty_events e where e.bounty_id = b.id and e.kind = 'started')
        )
      )
  ),
  rides as (
    select r.id, r.start_short, r.start_kind, m.status as membership,
      private.ride_phase(r) as phase, private.ride_departs_at(r) as departs_at, (
        select min(e.created_at) from public.ride_events e where e.ride_id = r.id and e.kind = 'departed'
      ) as departed_at
    from public.ride_members m
    join public.rides r on r.id = m.ride_id
    cross join me
    where m.member_id = me.uid and m.status in ('accepted', 'boarded')
  ),
  ride_subjects as (
    select jsonb_build_object(
      'kind', 'ride',
      'id', r.id,
      'phase', case when r.departed_at is null then 'meetup' else 'departed' end,
      'startName', r.start_short,
      'startHome', r.start_kind is not distinct from 'home',
      'gatherAt', r.departs_at - interval '30 minutes',
      'departAt', r.departs_at,
      'arrived', (
        select count(*) from public.ride_members c
        where c.ride_id = r.id and c.status = 'accepted' and c.arrived_at is not null
      ),
      'total', (select count(*) from public.ride_members c where c.ride_id = r.id and c.status = 'accepted'),
      'departedAt', r.departed_at,
      'aboard', (select count(*) from public.ride_members c where c.ride_id = r.id and c.status = 'boarded')
    ) as subject
    from rides r
    where (r.departed_at is null and r.membership = 'accepted' and r.phase = 'gathering')
      or (r.membership = 'boarded' and r.departed_at > now() - interval '15 minutes')
  )
  select coalesce(jsonb_agg(subject), '[]'::jsonb)
  from (select subject from bounties union all select subject from ride_subjects) s;
$$;

create or replace function public.live_activity_subjects() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.live_activity_subjects_for((select auth.uid()));
$$;

create function public.register_live_activity_device(
  device_key text,
  start_token text,
  language text,
  environment text,
  time_zone text,
  clock text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hash text := private.live_activity_key_hash(device_key);
  start text := lower(nullif(register_live_activity_device.start_token, ''));
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if language is null or language not in ('zh-Hans', 'en', 'ms') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  if environment is null or environment not in ('sandbox', 'production') then
    raise exception 'invalid_push_environment' using errcode = '22023';
  end if;
  if clock is null or clock not in ('h23', 'h12') then
    raise exception 'invalid_clock' using errcode = '22023';
  end if;
  if start is not null and (char_length(start) > 400 or start !~ '^[0-9a-f]{64,}$') then
    raise exception 'invalid_push_token' using errcode = '22023';
  end if;
  if time_zone is null or char_length(time_zone) > 64
    or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = register_live_activity_device.time_zone) then
    raise exception 'invalid_time_zone' using errcode = '22023';
  end if;

  -- A device that changes hands keeps none of the previous account's activities.
  delete from public.live_activity_tokens t
  using public.live_activity_devices d
  where t.device_id = d.id and d.key_hash = hash and d.user_id <> uid;
  update public.live_activity_devices d set start_token = null
  where d.start_token = start and d.key_hash <> hash;

  insert into public.live_activity_devices as d (key_hash, user_id, start_token, environment, language, time_zone, clock)
  values (
    hash, uid, start, register_live_activity_device.environment, register_live_activity_device.language,
    register_live_activity_device.time_zone, register_live_activity_device.clock
  )
  on conflict (key_hash) do update
    set user_id = excluded.user_id, start_token = excluded.start_token, environment = excluded.environment,
      language = excluded.language, time_zone = excluded.time_zone, clock = excluded.clock, updated_at = now();

  delete from public.live_activity_devices d
  where d.user_id = uid and d.id in (
    select x.id from public.live_activity_devices x where x.user_id = uid order by x.updated_at desc offset 10
  );
end;
$$;

-- These three run without a session (sign out with an expired session, the kit in a background wake): the device
-- key, a secret only that install holds, names the account.
create function public.unregister_live_activity_device(device_key text) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.live_activity_devices d
  where d.key_hash = private.live_activity_key_hash(unregister_live_activity_device.device_key);
$$;

create function public.detach_live_activity_token(device_key text, token text) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.live_activity_tokens t
  using public.live_activity_devices d
  where t.device_id = d.id and t.token = lower(detach_live_activity_token.token)
    and d.key_hash = private.live_activity_key_hash(detach_live_activity_token.device_key);
$$;

create function public.attach_live_activity_token(device_key text, token text, link text) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  device public.live_activity_devices;
  activity text := lower(attach_live_activity_token.token);
begin
  select * into device from public.live_activity_devices d
  where d.key_hash = private.live_activity_key_hash(attach_live_activity_token.device_key);
  if not found then
    return false;
  end if;
  if activity is null or char_length(activity) > 400 or activity !~ '^[0-9a-f]{64,}$' then
    raise exception 'invalid_push_token' using errcode = '22023';
  end if;
  if link is null
    or link !~ '^tapiro://(bounty/status|ride)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid_link' using errcode = '22023';
  end if;
  delete from public.live_activity_tokens t
  where t.device_id = device.id and t.link = attach_live_activity_token.link and t.token <> activity;
  insert into public.live_activity_tokens as t (token, device_id, link, last_content)
  values (
    activity, device.id, attach_live_activity_token.link,
    (select s.content from public.live_activity_started s
      where s.user_id = device.user_id and s.link = attach_live_activity_token.link)
  )
  on conflict on constraint live_activity_tokens_pkey do update
    set device_id = excluded.device_id, link = excluded.link, updated_at = now();
  insert into public.live_activity_started (user_id, link)
  values (device.user_id, attach_live_activity_token.link)
  on conflict do nothing;
  delete from public.live_activity_tokens t
  where t.device_id = device.id and t.token in (
    select x.token from public.live_activity_tokens x where x.device_id = device.id order by x.updated_at desc offset 20
  );
  return true;
end;
$$;

create function private.queue_live_activity_users(users uuid[], urgent boolean) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  insert into public.live_activity_due as q (user_id, urgent)
  select distinct u, queue_live_activity_users.urgent from unnest(users) u
  where u is not null
  on conflict (user_id) do update
    set version = q.version + 1, urgent = q.urgent or excluded.urgent,
      attempts = case when excluded.urgent then 0 else q.attempts end;
  get diagnostics queued = row_count;
  return queued;
end;
$$;

create function private.poke_notify_for_live_activities() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A missing Vault secret must not roll back the write that queued the work.
  begin
    perform public.call_edge_function('notify');
  exception when sqlstate 'TP001' then
    raise log '%', sqlerrm;
  end;
end;
$$;

create function private.queue_live_activity_events() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  users uuid[];
begin
  select coalesce(array_agg(distinct a.recipient), '{}') into users
  from added a
  where (a.kind like 'bounty.%' or a.kind like 'ride.%')
    and exists (select 1 from public.live_activity_devices d where d.user_id = a.recipient);
  if cardinality(users) > 0 and private.queue_live_activity_users(users, true) > 0 then
    perform private.poke_notify_for_live_activities();
  end if;
  return null;
end;
$$;

create trigger events_queue_live_activity
  after insert on public.events
  referencing new table as added
  for each statement execute function private.queue_live_activity_events();

-- Once a minute: every account with a running activity (the minutes count down), and every account whose device can
-- be push-started and has an item nobody started yet (a start that failed, or a device registered after the event).
create function public.run_live_activity_tick() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  users uuid[];
  queued integer := 0;
begin
  delete from public.live_activity_due q where q.attempts >= 3;
  delete from public.live_activity_tokens t where t.updated_at < now() - interval '12 hours';
  delete from public.live_activity_started s where s.created_at < now() - interval '1 day';

  with starters as (
    select distinct d.user_id from public.live_activity_devices d where d.start_token is not null
  ),
  candidates as (
    select b.poster_id as user_id, 'tapiro://bounty/status/' || b.id as link
    from public.bounties b join starters s on s.user_id = b.poster_id
    where b.status = 'en_route' and b.eta_at is not null
    union all
    select m.member_id, 'tapiro://ride/' || r.id
    from public.ride_members m
    join public.rides r on r.id = m.ride_id
    join starters s on s.user_id = m.member_id
    where m.status = 'accepted' and r.status in ('open', 'gathering') and private.ride_phase(r) = 'gathering'
  )
  select coalesce(array_agg(distinct x.user_id), '{}') into users
  from (
    select d.user_id from public.live_activity_tokens t join public.live_activity_devices d on d.id = t.device_id
    union all
    select c.user_id from candidates c
    where not exists (select 1 from public.live_activity_started s where s.user_id = c.user_id and s.link = c.link)
  ) x;

  if cardinality(users) > 0 then
    queued := private.queue_live_activity_users(users, false);
  end if;
  if exists (select 1 from public.live_activity_due q where q.due_at <= now()) then
    perform private.poke_notify_for_live_activities();
  end if;
  return queued;
end;
$$;

create function public.claim_live_activity_work(max_rows integer default 50) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer jsonb;
begin
  with due as (
    select q.user_id, q.urgent from public.live_activity_due q
    where q.due_at <= now() and q.attempts < 3
      and (q.claimed_at is null or q.claimed_at < now() - interval '2 minutes')
    order by q.due_at, q.user_id
    limit greatest(1, least(coalesce(max_rows, 50), 200))
    for update skip locked
  ),
  claimed as (
    update public.live_activity_due q
    set claimed_at = now(), claimed_version = q.version, attempts = q.attempts + 1, urgent = false
    from due where q.user_id = due.user_id
    returning q.user_id, q.version, q.due_at, due.urgent
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', c.user_id,
    'version', c.version,
    'urgent', c.urgent,
    'subjects', private.live_activity_subjects_for(c.user_id),
    'started', coalesce((
      select jsonb_agg(jsonb_build_object('link', s.link, 'at', s.created_at) order by s.link)
      from public.live_activity_started s where s.user_id = c.user_id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'startToken', d.start_token,
        'environment', d.environment,
        'language', d.language,
        'timeZone', d.time_zone,
        'clock', d.clock,
        'activities', coalesce((
          select jsonb_agg(jsonb_build_object('token', t.token, 'link', t.link, 'lastContent', t.last_content)
            order by t.created_at)
          from public.live_activity_tokens t where t.device_id = d.id
        ), '[]'::jsonb)
      ) order by d.updated_at desc)
      from public.live_activity_devices d where d.user_id = c.user_id
    ), '[]'::jsonb)
  ) order by c.due_at, c.user_id), '[]'::jsonb)
  into answer
  from claimed c;
  return answer;
end;
$$;

-- Only what APNs accepted is recorded; anything else is tried again by the next tick.
create function public.finish_live_activity_work(work_user uuid, work_version bigint, outcome jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.live_activity_tokens t set last_content = x.content, updated_at = now()
  from jsonb_to_recordset(coalesce(outcome -> 'contents', '[]'::jsonb)) as x (token text, content jsonb)
  where t.token = x.token;
  delete from public.live_activity_tokens t
  where t.token in (
    select jsonb_array_elements_text(coalesce(outcome -> 'ended', '[]'::jsonb))
    union all
    select jsonb_array_elements_text(coalesce(outcome -> 'dropped', '[]'::jsonb))
  );
  update public.live_activity_devices d set start_token = null
  where d.start_token in (select jsonb_array_elements_text(coalesce(outcome -> 'dropped', '[]'::jsonb)));
  insert into public.live_activity_started (user_id, link, content)
  select work_user, x.link, x.content
  from jsonb_to_recordset(coalesce(outcome -> 'started', '[]'::jsonb)) as x (link text, content jsonb)
  on conflict do nothing;
  delete from public.live_activity_due q where q.user_id = work_user and q.version = work_version;
  update public.live_activity_due q set claimed_at = null
  where q.user_id = work_user and q.claimed_version = work_version;
end;
$$;

revoke all on function private.live_activity_key_hash(text) from public, anon, authenticated;
revoke all on function private.live_activity_subjects_for(uuid) from public, anon, authenticated;
revoke all on function public.register_live_activity_device(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.unregister_live_activity_device(text) from public, anon, authenticated;
revoke all on function public.attach_live_activity_token(text, text, text) from public, anon, authenticated;
revoke all on function public.detach_live_activity_token(text, text) from public, anon, authenticated;
revoke all on function private.queue_live_activity_users(uuid[], boolean) from public, anon, authenticated;
revoke all on function private.poke_notify_for_live_activities() from public, anon, authenticated;
revoke all on function private.queue_live_activity_events() from public, anon, authenticated;
revoke all on function public.run_live_activity_tick() from public, anon, authenticated;
revoke all on function public.claim_live_activity_work(integer) from public, anon, authenticated;
revoke all on function public.finish_live_activity_work(uuid, bigint, jsonb) from public, anon, authenticated;

grant execute on function public.register_live_activity_device(text, text, text, text, text, text) to authenticated;
grant execute on function public.unregister_live_activity_device(text) to anon, authenticated;
grant execute on function public.attach_live_activity_token(text, text, text) to anon, authenticated;
grant execute on function public.detach_live_activity_token(text, text) to anon, authenticated;
grant execute on function public.claim_live_activity_work(integer) to service_role;
grant execute on function public.finish_live_activity_work(uuid, bigint, jsonb) to service_role;

select cron.schedule('live-activity-tick', '* * * * *', $$select public.run_live_activity_tick()$$);

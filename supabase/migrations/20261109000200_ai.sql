create table public.ai_consent_versions (
  version integer primary key check (version > 0),
  provider text not null,
  purpose text not null,
  created_at timestamptz not null default now()
);

insert into public.ai_consent_versions (version, provider, purpose)
values (1, 'Alibaba Cloud Model Studio (Singapore)', 'bounty_draft,answer,translate');

alter table public.ai_consent_versions enable row level security;
revoke all on public.ai_consent_versions from anon, authenticated;

create table public.ai_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null references public.ai_consent_versions (version),
  provider text not null,
  purpose text not null,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (withdrawn_at is null or withdrawn_at >= accepted_at)
);

create unique index ai_consents_active on public.ai_consents (user_id, version) where withdrawn_at is null;

alter table public.ai_consents enable row level security;
revoke all on public.ai_consents from anon, authenticated;
grant select on public.ai_consents to authenticated;

create policy ai_consents_select_own on public.ai_consents
  for select to authenticated
  using (user_id = (select auth.uid()));

create table public.ai_energy (
  user_id uuid primary key references auth.users (id) on delete cascade,
  level integer not null check (level between 0 and 1000),
  refilled_on date not null,
  lease uuid,
  lease_until timestamptz,
  check ((lease is null) = (lease_until is null))
);

alter table public.ai_energy enable row level security;
revoke all on public.ai_energy from anon, authenticated;

create type public.ai_pantry_reason as enum ('swap', 'feed');

-- coin_ledger_id has no foreign key: one would make TRUNCATE on coin_ledger fail on the reference before its append-only
-- trigger answers. Neither ledger can lose a row, so the id stays valid without it.
create table public.ai_pantry (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  reason public.ai_pantry_reason not null,
  delta integer not null,
  coin_ledger_id bigint,
  created_at timestamptz not null default now(),
  check (
    (reason = 'swap' and delta = 1 and coin_ledger_id is not null)
    or (reason = 'feed' and delta = -1 and coin_ledger_id is null)
  )
);

create index ai_pantry_user on public.ai_pantry (user_id);

create trigger ai_pantry_append_only
  before update or delete on public.ai_pantry
  for each row execute function public.coin_ledger_append_only();

create trigger ai_pantry_no_truncate
  before truncate on public.ai_pantry
  for each statement execute function public.coin_ledger_append_only();

alter table public.ai_pantry enable row level security;
revoke all on public.ai_pantry from anon, authenticated;
grant select on public.ai_pantry to authenticated;

create policy ai_pantry_select_own on public.ai_pantry
  for select to authenticated
  using (user_id = (select auth.uid()));

create table public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('place', 'preference')),
  content text not null check (char_length(btrim(content)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index ai_memory_user on public.ai_memory (user_id, created_at);

alter table public.ai_memory enable row level security;
revoke all on public.ai_memory from anon, authenticated;
grant select, insert, update, delete on public.ai_memory to authenticated;

create policy ai_memory_select_own on public.ai_memory
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy ai_memory_insert_own on public.ai_memory
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy ai_memory_update_own on public.ai_memory
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy ai_memory_delete_own on public.ai_memory
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tokens stay on the server and no prompt or response ever lands here: these columns are the whole record of a call.
create table public.ai_metering (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  task text not null check (task in ('draft_bounty', 'answer', 'translate')),
  model text not null check (char_length(model) between 1 and 100),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  energy_spent integer not null check (energy_spent >= 0),
  created_at timestamptz not null default now()
);

create index ai_metering_user on public.ai_metering (user_id, created_at);

alter table public.ai_metering enable row level security;
revoke all on public.ai_metering from anon, authenticated;

create function private.ai_energy_full() returns integer
language sql
immutable
set search_path = ''
as $$
  select 1000;
$$;

create function private.ai_refill_day(at timestamptz) returns date
language sql
stable
set search_path = ''
as $$
  select ((at at time zone 'Asia/Kuala_Lumpur') - interval '6 hours')::date;
$$;

create function private.ai_consent_version() returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(version) from public.ai_consent_versions;
$$;

create function private.ai_has_consent(uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ai_consents c
    where c.user_id = uid and c.withdrawn_at is null and c.version = private.ai_consent_version()
  );
$$;

create function private.ai_status_json(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'consent', jsonb_build_object(
      'currentVersion', private.ai_consent_version(),
      'given', private.ai_has_consent(uid)
    ),
    'energy', coalesce(
      (
        select case when e.refilled_on < private.ai_refill_day(now()) then private.ai_energy_full() else e.level end
        from public.ai_energy e where e.user_id = uid
      ),
      private.ai_energy_full()
    ),
    'energyFull', private.ai_energy_full(),
    'leaves', (select coalesce(sum(p.delta), 0) from public.ai_pantry p where p.user_id = uid),
    'coins', (select coalesce(sum(l.delta), 0) from public.coin_ledger l where l.user_id = uid),
    'nextRefillAt',
      ((private.ai_refill_day(now()) + 1)::timestamp + interval '6 hours') at time zone 'Asia/Kuala_Lumpur'
  );
$$;

-- The stored level can lag the 06:00 job, so every write goes through here and applies a missed refill first.
create function private.ai_energy_row(uid uuid) returns public.ai_energy
language plpgsql
security definer
set search_path = ''
as $$
declare
  day date := private.ai_refill_day(now());
  stored public.ai_energy;
begin
  insert into public.ai_energy (user_id, level, refilled_on)
  values (uid, private.ai_energy_full(), day)
  on conflict (user_id) do nothing;
  select * into stored from public.ai_energy e where e.user_id = uid for update;
  if stored.refilled_on < day then
    update public.ai_energy e set level = private.ai_energy_full(), refilled_on = day
    where e.user_id = uid
    returning * into stored;
  end if;
  return stored;
end;
$$;

revoke all on function private.ai_energy_full() from public, anon, authenticated;
revoke all on function private.ai_refill_day(timestamptz) from public, anon, authenticated;
revoke all on function private.ai_consent_version() from public, anon, authenticated;
revoke all on function private.ai_has_consent(uuid) from public, anon, authenticated;
revoke all on function private.ai_status_json(uuid) from public, anon, authenticated;
revoke all on function private.ai_energy_row(uuid) from public, anon, authenticated;

create function public.ai_status() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.ai_status_json((select auth.uid())) where (select auth.uid()) is not null;
$$;

revoke all on function public.ai_status() from public, anon;
grant execute on function public.ai_status() to authenticated;

create function public.record_consent(version integer) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := (select auth.uid());
  offered public.ai_consent_versions;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- A client still showing an older screen must not record consent to terms it did not display.
  if record_consent.version is distinct from private.ai_consent_version() then
    raise exception 'stale_consent_version' using errcode = '22023';
  end if;
  select * into offered from public.ai_consent_versions v where v.version = record_consent.version;
  insert into public.ai_consents (user_id, version, provider, purpose)
  values (uid, offered.version, offered.provider, offered.purpose)
  on conflict (user_id, version) where withdrawn_at is null do nothing;
  return private.ai_status_json(uid);
end;
$$;

revoke all on function public.record_consent(integer) from public, anon;
grant execute on function public.record_consent(integer) to authenticated;

create function public.withdraw_consent() returns jsonb
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
  update public.ai_consents c set withdrawn_at = now()
  where c.user_id = uid and c.withdrawn_at is null;
  return private.ai_status_json(uid);
end;
$$;

revoke all on function public.withdraw_consent() from public, anon;
grant execute on function public.withdraw_consent() to authenticated;

create function public.swap_coin_for_leaf() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  spent bigint;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('coins:' || uid::text, 0));
  if (select coalesce(sum(l.delta), 0) from public.coin_ledger l where l.user_id = uid) < 1 then
    raise exception 'no_balance' using errcode = '55000';
  end if;
  insert into public.coin_ledger (user_id, reason, delta)
  values (uid, 'pantry_swap', -1)
  returning id into spent;
  insert into public.ai_pantry (user_id, reason, delta, coin_ledger_id)
  values (uid, 'swap', 1, spent);
  return private.ai_status_json(uid);
end;
$$;

revoke all on function public.swap_coin_for_leaf() from public, anon;
grant execute on function public.swap_coin_for_leaf() to authenticated;

create function public.feed_leaf() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  stored public.ai_energy;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('coins:' || uid::text, 0));
  stored := private.ai_energy_row(uid);
  if stored.level >= private.ai_energy_full() then
    raise exception 'already_full' using errcode = '55000';
  end if;
  if (select coalesce(sum(p.delta), 0) from public.ai_pantry p where p.user_id = uid) < 1 then
    raise exception 'no_leaf' using errcode = '55000';
  end if;
  insert into public.ai_pantry (user_id, reason, delta) values (uid, 'feed', -1);
  update public.ai_energy e set level = private.ai_energy_full() where e.user_id = uid;
  return private.ai_status_json(uid);
end;
$$;

revoke all on function public.feed_leaf() from public, anon;
grant execute on function public.feed_leaf() to authenticated;

-- A single lease per user: without it, parallel requests all pass the energy check before any of them deducts, and
-- energy stops bounding what one account can spend at the provider.
create function public.ai_begin_call(uid uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.ai_energy;
  granted uuid := gen_random_uuid();
begin
  if uid is null then
    raise exception 'invalid_call' using errcode = '22023';
  end if;
  if not private.ai_has_consent(uid) then
    return jsonb_build_object('status', 'consent_required');
  end if;
  stored := private.ai_energy_row(uid);
  if stored.level <= 0 then
    return jsonb_build_object('status', 'hungry');
  end if;
  if stored.lease_until > now() then
    return jsonb_build_object('status', 'busy');
  end if;
  update public.ai_energy e set lease = granted, lease_until = now() + interval '60 seconds'
  where e.user_id = uid;
  return jsonb_build_object(
    'status', 'ok', 'lease', granted, 'energy', stored.level, 'energyFull', private.ai_energy_full()
  );
end;
$$;

revoke all on function public.ai_begin_call(uuid) from public, anon, authenticated;
grant execute on function public.ai_begin_call(uuid) to service_role;

create function public.ai_finish_call(
  uid uuid,
  held uuid,
  task text,
  model text,
  input_tokens integer,
  output_tokens integer,
  energy_spent integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.ai_energy;
begin
  if uid is null or held is null then
    raise exception 'invalid_call' using errcode = '22023';
  end if;
  stored := private.ai_energy_row(uid);
  insert into public.ai_metering (user_id, task, model, input_tokens, output_tokens, energy_spent)
  values (uid, ai_finish_call.task, ai_finish_call.model, ai_finish_call.input_tokens, ai_finish_call.output_tokens,
    ai_finish_call.energy_spent);
  update public.ai_energy e set
    level = greatest(0, stored.level - ai_finish_call.energy_spent),
    lease = case when e.lease = held then null else e.lease end,
    lease_until = case when e.lease = held then null else e.lease_until end
  where e.user_id = uid
  returning * into stored;
  return jsonb_build_object('energy', stored.level, 'energyFull', private.ai_energy_full());
end;
$$;

revoke all on function public.ai_finish_call(uuid, uuid, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.ai_finish_call(uuid, uuid, text, text, integer, integer, integer) to service_role;

create function public.ai_abort_call(uid uuid, held uuid) returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_energy e set lease = null, lease_until = null
  where e.user_id = uid and e.lease = held;
$$;

revoke all on function public.ai_abort_call(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ai_abort_call(uuid, uuid) to service_role;

create function private.refill_ai_energy(as_of timestamptz) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  refilled integer;
begin
  update public.ai_energy e
  set level = private.ai_energy_full(), refilled_on = private.ai_refill_day(as_of)
  where e.refilled_on < private.ai_refill_day(as_of);
  get diagnostics refilled = row_count;
  return refilled;
end;
$$;

revoke all on function private.refill_ai_energy(timestamptz) from public, anon, authenticated;

create function public.refill_ai_energy() returns integer
language sql
security definer
set search_path = ''
as $$
  select private.refill_ai_energy(now());
$$;

revoke all on function public.refill_ai_energy() from public, anon, authenticated;
grant execute on function public.refill_ai_energy() to service_role;

-- 22:00 UTC is 06:00 Malaysia time.
select cron.schedule('ai-energy-refill-daily', '0 22 * * *', $$select public.refill_ai_energy()$$);

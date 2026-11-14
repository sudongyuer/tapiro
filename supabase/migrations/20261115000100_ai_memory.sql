-- 小貘记得 (145, 281–284): entries are written only through these functions, so the switch, the per-user cap and one
-- entry per label hold whichever client writes. Reads and single deletes stay direct under RLS.
alter table public.ai_memory
  add column label text not null check (char_length(btrim(label)) between 1 and 40),
  add column updated_at timestamptz not null default now();

create unique index ai_memory_label on public.ai_memory (user_id, lower(btrim(label)));

drop policy ai_memory_insert_own on public.ai_memory;
drop policy ai_memory_update_own on public.ai_memory;
revoke insert, update on public.ai_memory from authenticated;

create table public.ai_memory_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ai_memory_prefs enable row level security;
revoke all on public.ai_memory_prefs from anon, authenticated;
grant select on public.ai_memory_prefs to authenticated;

create policy ai_memory_prefs_select_own on public.ai_memory_prefs
  for select to authenticated
  using (user_id = (select auth.uid()));

create function private.ai_memory_limit() returns integer
language sql
immutable
set search_path = ''
as $$
  select 50;
$$;

create function private.ai_memory_send_limit() returns integer
language sql
immutable
set search_path = ''
as $$
  select 30;
$$;

create function private.ai_memory_enabled(uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.enabled from public.ai_memory_prefs p where p.user_id = uid), true);
$$;

revoke all on function private.ai_memory_limit() from public, anon, authenticated;
revoke all on function private.ai_memory_send_limit() from public, anon, authenticated;
revoke all on function private.ai_memory_enabled(uuid) from public, anon, authenticated;

create function private.ai_memory_row_json(entry public.ai_memory) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', entry.id, 'kind', entry.kind, 'label', entry.label, 'content', entry.content,
    'updatedAt', entry.updated_at
  );
$$;

revoke all on function private.ai_memory_row_json(public.ai_memory) from public, anon, authenticated;

-- With no id this adds an entry, or replaces the value of the entry already holding that label (「记住」 said again).
-- Adding needs the switch on (283 A); correcting an entry that is already kept does not.
create function public.save_ai_memory(entry uuid, kind text, label text, content text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_label text := btrim(save_ai_memory.label);
  clean_content text := btrim(save_ai_memory.content);
  existing public.ai_memory;
  saved public.ai_memory;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if save_ai_memory.kind is null or save_ai_memory.kind not in ('place', 'preference') then
    raise exception 'invalid_memory' using errcode = '22023';
  end if;
  if clean_label is null or char_length(clean_label) not between 1 and 40
    or clean_content is null or char_length(clean_content) not between 1 and 200 then
    raise exception 'invalid_memory' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ai_memory:' || uid::text, 0));

  select * into existing from public.ai_memory m
  where m.user_id = uid and lower(btrim(m.label)) = lower(clean_label);

  if save_ai_memory.entry is not null then
    if not exists (select 1 from public.ai_memory m where m.id = save_ai_memory.entry and m.user_id = uid) then
      raise exception 'memory_not_found' using errcode = 'P0002';
    end if;
    if existing.id is not null and existing.id <> save_ai_memory.entry then
      raise exception 'label_taken' using errcode = '23505';
    end if;
    update public.ai_memory m
    set kind = save_ai_memory.kind, label = clean_label, content = clean_content, updated_at = now()
    where m.id = save_ai_memory.entry
    returning * into saved;
    return private.ai_memory_row_json(saved);
  end if;

  if not private.ai_memory_enabled(uid) then
    raise exception 'memory_off' using errcode = '55000';
  end if;
  if existing.id is not null then
    update public.ai_memory m
    set kind = save_ai_memory.kind, label = clean_label, content = clean_content, updated_at = now()
    where m.id = existing.id
    returning * into saved;
    return private.ai_memory_row_json(saved);
  end if;
  if (select count(*) from public.ai_memory m where m.user_id = uid) >= private.ai_memory_limit() then
    raise exception 'memory_full' using errcode = '55000';
  end if;
  insert into public.ai_memory (user_id, kind, label, content)
  values (uid, save_ai_memory.kind, clean_label, clean_content)
  returning * into saved;
  return private.ai_memory_row_json(saved);
end;
$$;

revoke all on function public.save_ai_memory(uuid, text, text, text) from public, anon;
grant execute on function public.save_ai_memory(uuid, text, text, text) to authenticated;

create function public.set_ai_memory_enabled(enabled boolean) returns jsonb
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
  if set_ai_memory_enabled.enabled is null then
    raise exception 'invalid_memory' using errcode = '22023';
  end if;
  insert into public.ai_memory_prefs (user_id, enabled)
  values (uid, set_ai_memory_enabled.enabled)
  on conflict (user_id) do update set enabled = excluded.enabled, updated_at = now();
  return jsonb_build_object('enabled', set_ai_memory_enabled.enabled);
end;
$$;

revoke all on function public.set_ai_memory_enabled(boolean) from public, anon;
grant execute on function public.set_ai_memory_enabled(boolean) to authenticated;

create function public.clear_ai_memory() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  removed integer;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  delete from public.ai_memory m where m.user_id = uid;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.clear_ai_memory() from public, anon;
grant execute on function public.clear_ai_memory() to authenticated;

-- What one drafting or answering call may send (282 A): nothing while the switch is off, else the newest 30 entries.
create function public.ai_memory_for_call(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'enabled', private.ai_memory_enabled(uid),
    'full', (select count(*) from public.ai_memory m where m.user_id = uid) >= private.ai_memory_limit(),
    'entries', case when private.ai_memory_enabled(uid) then coalesce((
      select jsonb_agg(private.ai_memory_row_json(newest) order by newest.updated_at desc, newest.id)
      from (
        select * from public.ai_memory m where m.user_id = uid
        order by m.updated_at desc, m.id limit private.ai_memory_send_limit()
      ) newest
    ), '[]'::jsonb) else '[]'::jsonb end
  );
$$;

revoke all on function public.ai_memory_for_call(uuid) from public, anon, authenticated;
grant execute on function public.ai_memory_for_call(uuid) to service_role;

-- 282 A: the consent page's 会发 now names the 小貘记得 entries, so everyone who consented to version 1 is asked again.
insert into public.ai_consent_versions (version, provider, purpose)
values (2, 'Alibaba Cloud Model Studio (Singapore)', 'bounty_draft,answer,translate');

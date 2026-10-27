create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked on public.blocks (blocked_id, blocker_id);

alter table public.blocks enable row level security;

revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;

create policy blocks_select_own on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create function public.block_user(target uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target = (select auth.uid()) then
    raise exception 'cannot_block_self' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  insert into public.blocks (blocker_id, blocked_id)
  values ((select auth.uid()), target)
  on conflict do nothing;
end;
$$;

create function public.unblock_user(target uuid) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = target;
$$;

revoke all on function public.block_user(uuid) from public, anon, authenticated;
revoke all on function public.unblock_user(uuid) from public, anon, authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function private.is_blocked_between(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated, service_role;

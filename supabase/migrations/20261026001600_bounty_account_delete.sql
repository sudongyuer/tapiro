alter table public.bounties drop constraint bounties_helper;
-- A settled bounty stays 'confirmed' after its helper deletes their account (helper_id is set null).
alter table public.bounties add constraint bounties_helper check (
  case status
    when 'open' then helper_id is null
    when 'closed' then helper_id is null
    when 'confirmed' then true
    when 'cancelled' then true
    else helper_id is not null
  end
);

create function public.active_bounties_of(uid uuid) returns table (
  id uuid,
  title text,
  reward_sen integer,
  role text,
  counterpart_id uuid,
  status public.bounty_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.title,
    b.reward_sen,
    case when b.poster_id = uid then 'poster' else 'helper' end,
    case when b.poster_id = uid then b.helper_id else b.poster_id end,
    b.status
  from public.bounties b
  where (b.poster_id = uid or b.helper_id = uid)
    and b.status in ('assigned', 'en_route', 'done', 'disputed')
  order by b.status_changed_at, b.id;
$$;

revoke all on function public.active_bounties_of(uuid) from public, anon, authenticated;
grant execute on function public.active_bounties_of(uuid) to service_role;

create function private.bounties_before_user_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item uuid;
begin
  if exists (select 1 from public.active_bounties_of(old.id)) then
    raise exception 'active_bounties' using errcode = '55000';
  end if;
  for item in
    select b.id from public.bounties b where b.poster_id = old.id and b.status = 'open' order by b.id
  loop
    perform private.close_bounty(item, 'closed');
  end loop;
  delete from public.bounty_addresses a
  using public.bounties b
  where b.id = a.bounty_id and b.poster_id = old.id;
  return old;
end;
$$;

revoke all on function private.bounties_before_user_delete() from public, anon, authenticated;

create trigger bounties_before_user_delete
  before delete on auth.users
  for each row execute function private.bounties_before_user_delete();

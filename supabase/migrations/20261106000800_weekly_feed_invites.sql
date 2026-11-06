create function public.malaysia_week(at timestamptz) returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', at at time zone 'Asia/Kuala_Lumpur')::date;
$$;

revoke all on function public.malaysia_week(timestamptz) from public, anon;
grant execute on function public.malaysia_week(timestamptz) to authenticated, service_role;

create table public.weekly_feeds (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  fed_at timestamptz not null default now(),
  primary key (user_id, week)
);

alter table public.weekly_feeds enable row level security;
revoke all on public.weekly_feeds from anon, authenticated;

create function private.weekly_feed_json(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'fedThisWeek', exists (
      select 1 from public.weekly_feeds f where f.user_id = uid and f.week = public.malaysia_week(now())
    ),
    'nextWeekAt', (public.malaysia_week(now()) + 7)::timestamp at time zone 'Asia/Kuala_Lumpur',
    'coins', (select coalesce(sum(l.delta), 0) from public.coin_ledger l where l.user_id = uid)
  );
$$;

revoke all on function private.weekly_feed_json(uuid) from public, anon, authenticated;

create function public.weekly_feed_status() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.weekly_feed_json((select auth.uid())) where (select auth.uid()) is not null;
$$;

revoke all on function public.weekly_feed_status() from public, anon;
grant execute on function public.weekly_feed_status() to authenticated;

create function public.feed_weekly() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fed boolean;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('coins:' || uid::text, 0));
  insert into public.weekly_feeds (user_id, week) values (uid, public.malaysia_week(now()))
  on conflict do nothing;
  fed := found;
  if fed then
    perform private.grant_coins(uid, 'weekly_feed'::public.coin_reason, 1);
  end if;
  return jsonb_build_object('status', case when fed then 'fed' else 'already_fed' end)
    || private.weekly_feed_json(uid);
end;
$$;

revoke all on function public.feed_weekly() from public, anon;
grant execute on function public.feed_weekly() to authenticated;

create table public.invite_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.invites (
  invitee_id uuid primary key references auth.users (id) on delete cascade,
  inviter_id uuid references auth.users (id) on delete set null,
  code text not null check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  redeemed_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (invitee_id <> inviter_id)
);

create index invites_inviter on public.invites (inviter_id, redeemed_at desc);

alter table public.invite_codes enable row level security;
alter table public.invites enable row level security;
revoke all on public.invite_codes, public.invites from anon, authenticated;

create function private.ensure_invite_code(uid uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  stored text;
  candidate text;
begin
  select c.code into stored from public.invite_codes c where c.user_id = uid;
  if found then
    return stored;
  end if;
  for attempt in 1..20 loop
    select string_agg(substr(alphabet, 1 + floor(random() * 32)::integer, 1), '') into candidate
    from generate_series(1, 6);
    begin
      insert into public.invite_codes (user_id, code) values (uid, candidate)
      on conflict (user_id) do nothing;
      select c.code into stored from public.invite_codes c where c.user_id = uid;
      return stored;
    exception when unique_violation then
      continue;
    end;
  end loop;
  raise exception 'invite_code_exhausted' using errcode = '55000';
end;
$$;

revoke all on function private.ensure_invite_code(uuid) from public, anon, authenticated;

create function private.has_settled_item(uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.stickers s where s.owner_id = uid);
$$;

revoke all on function private.has_settled_item(uuid) from public, anon, authenticated;

create function private.invite_json(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', (select c.code from public.invite_codes c where c.user_id = uid),
    'reward', 3,
    'redeemed', (
      select jsonb_build_object(
        'code', i.code, 'inviter', private.person_json(i.inviter_id), 'rewarded', i.rewarded_at is not null
      )
      from public.invites i where i.invitee_id = uid
    ),
    'canRedeem', not exists (select 1 from public.invites i where i.invitee_id = uid)
      and not private.has_settled_item(uid),
    'invited', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'person', private.person_json(i.invitee_id),
          'redeemedAt', i.redeemed_at,
          'rewardedAt', i.rewarded_at
        )
        order by i.redeemed_at desc, i.invitee_id
      )
      from public.invites i where i.inviter_id = uid
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.invite_json(uuid) from public, anon, authenticated;

create function public.my_invite() returns jsonb
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
  perform private.ensure_invite_code(uid);
  return private.invite_json(uid);
end;
$$;

revoke all on function public.my_invite() from public, anon;
grant execute on function public.my_invite() to authenticated;

create function public.redeem_invite(code text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  typed text := upper(regexp_replace(coalesce(code, ''), '[\s\-]', '', 'g'));
  code_owner uuid;
  stored public.invites;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('invite:' || uid::text, 0));
  select * into stored from public.invites i where i.invitee_id = uid;
  if found then
    if stored.code = typed then
      return private.invite_json(uid);
    end if;
    raise exception 'already_redeemed' using errcode = '55000';
  end if;
  select c.user_id into code_owner from public.invite_codes c where c.code = typed;
  if code_owner is null then
    raise exception 'code_not_found' using errcode = 'P0002';
  end if;
  if code_owner = uid then
    raise exception 'own_code' using errcode = '22023';
  end if;
  if private.has_settled_item(uid) then
    raise exception 'too_late' using errcode = '55000';
  end if;
  -- Both people of a pair take one lock, so A redeeming B's code and B redeeming A's at once cannot both pass.
  perform pg_advisory_xact_lock(hashtextextended(
    'invite-pair:' || least(uid, code_owner)::text || ':' || greatest(uid, code_owner)::text, 0
  ));
  if exists (select 1 from public.invites i where i.invitee_id = code_owner and i.inviter_id = uid) then
    raise exception 'mutual_invite' using errcode = '55000';
  end if;
  insert into public.invites (invitee_id, inviter_id, code) values (uid, code_owner, typed);
  return private.invite_json(uid);
end;
$$;

revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- The reward waits for a settled item with someone other than the inviter, so two friends cannot farm it alone.
create function private.reward_invite_on_sticker() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites;
  others uuid[];
begin
  if not exists (select 1 from public.invites i where i.invitee_id = new.owner_id and i.rewarded_at is null) then
    return null;
  end if;
  -- Shared, so settles inserting stickers for the same people in different orders never wait on each other; a code
  -- being entered (exclusive in redeem_invite) still waits for the settle, and the reverse.
  perform pg_advisory_xact_lock_shared(hashtextextended('invite:' || new.owner_id::text, 0));
  select * into inv from public.invites i where i.invitee_id = new.owner_id and i.rewarded_at is null for update;
  if not found then
    return null;
  end if;
  if new.item_kind = 'bounty' then
    select array[case when p.payer_id = new.owner_id then p.payee_id else p.payer_id end] into others
    from public.payments p where p.id = new.payment_id;
  else
    select case
      when r.organiser_id = new.owner_id then coalesce((
        select array_agg(s.owner_id) from public.stickers s
        where s.item_kind = 'ride' and s.item_id = new.item_id and s.owner_id <> new.owner_id
      ), '{}')
      else array[r.organiser_id]
    end into others
    from public.rides r where r.id = new.item_id;
  end if;
  if not exists (
    select 1 from unnest(coalesce(others, '{}')) person
    where person is not null and person is distinct from inv.inviter_id
  ) then
    return null;
  end if;
  update public.invites i set rewarded_at = now() where i.invitee_id = inv.invitee_id;
  perform private.grant_coins(inv.invitee_id, 'invite_invitee'::public.coin_reason, 3);
  if inv.inviter_id is not null then
    perform private.grant_coins(inv.inviter_id, 'invite_inviter'::public.coin_reason, 3);
  end if;
  return null;
end;
$$;

revoke all on function private.reward_invite_on_sticker() from public, anon, authenticated;

create trigger stickers_reward_invite
  after insert on public.stickers
  for each row execute function private.reward_invite_on_sticker();

create function public.coin_history(before bigint default null, max_count integer default 50) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with page as (
    select l.*, row_number() over (order by l.id desc) as n
    from public.coin_ledger l
    where l.user_id = (select auth.uid()) and (before is null or l.id < before)
    order by l.id desc
    limit least(greatest(coalesce(max_count, 50), 1), 100) + 1
  ),
  size as (select least(greatest(coalesce(max_count, 50), 1), 100) as n)
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'reason', p.reason,
          'delta', p.delta,
          'at', p.created_at,
          'month', to_char(public.malaysia_month(p.created_at), 'YYYY-MM'),
          'item', case when p.item_id is not null then jsonb_build_object(
            'kind', p.item_kind, 'id', p.item_id, 'title', private.item_title(p.item_kind, p.item_id)
          ) end
        )
        order by p.id desc
      )
      from page p where p.n <= (select n from size)
    ), '[]'::jsonb),
    'hasMore', (select count(*) from page) > (select n from size),
    'nextCursor', case when (select count(*) from page) > (select n from size) then
      (select p.id from page p where p.n = (select n from size))
    end
  )
  where (select auth.uid()) is not null;
$$;

revoke all on function public.coin_history(bigint, integer) from public, anon;
grant execute on function public.coin_history(bigint, integer) to authenticated;

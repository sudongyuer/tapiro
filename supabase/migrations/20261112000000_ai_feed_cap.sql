-- 149 A: at most this many paid leaves a refill day. Provisional until real usage is measured.
create function private.ai_feed_limit() returns integer
language sql
immutable
set search_path = ''
as $$
  select 5;
$$;

create function private.ai_feeds_today(uid uuid) returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.ai_pantry p
  where p.user_id = uid and p.reason = 'feed'
    and private.ai_refill_day(p.created_at) = private.ai_refill_day(now());
$$;

revoke all on function private.ai_feed_limit() from public, anon, authenticated;
revoke all on function private.ai_feeds_today(uuid) from public, anon, authenticated;

create or replace function private.ai_status_json(uid uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'consent', jsonb_build_object(
      'currentVersion', private.ai_consent_version(),
      'given', private.ai_has_consent(uid),
      'acceptedAt', (
        select max(c.accepted_at) from public.ai_consents c
        where c.user_id = uid and c.withdrawn_at is null and c.version = private.ai_consent_version()
      )
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
    'feedsLeft', greatest(0, private.ai_feed_limit() - private.ai_feeds_today(uid)),
    'coins', (select coalesce(sum(l.delta), 0) from public.coin_ledger l where l.user_id = uid),
    'nextRefillAt',
      ((private.ai_refill_day(now()) + 1)::timestamp + interval '6 hours') at time zone 'Asia/Kuala_Lumpur'
  );
$$;

create or replace function public.feed_leaf() returns jsonb
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
  -- Checked before the pantry, so a capped user is told to come back tomorrow rather than to buy a leaf.
  if private.ai_feeds_today(uid) >= private.ai_feed_limit() then
    raise exception 'fed_enough' using errcode = '55000';
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

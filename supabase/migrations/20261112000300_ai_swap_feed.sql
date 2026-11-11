-- The hungry sheet swaps a coin and feeds the leaf in one tap (139 A). One transaction checks every feed condition before
-- the coin is spent, so a refused feed never leaves a paid coin swapped into the pantry behind the user's back.
create function public.swap_and_feed_leaf() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  stored public.ai_energy;
  spent bigint;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('coins:' || uid::text, 0));
  stored := private.ai_energy_row(uid);
  if stored.level >= private.ai_energy_full() then
    raise exception 'already_full' using errcode = '55000';
  end if;
  if private.ai_feeds_today(uid) >= private.ai_feed_limit() then
    raise exception 'fed_enough' using errcode = '55000';
  end if;
  -- A screen that missed a swap made elsewhere would otherwise spend a coin while a free leaf waits in the jar.
  if (select coalesce(sum(p.delta), 0) from public.ai_pantry p where p.user_id = uid) > 0 then
    raise exception 'has_leaf' using errcode = '55000';
  end if;
  if (select coalesce(sum(l.delta), 0) from public.coin_ledger l where l.user_id = uid) < 1 then
    raise exception 'no_balance' using errcode = '55000';
  end if;
  insert into public.coin_ledger (user_id, reason, delta)
  values (uid, 'pantry_swap', -1)
  returning id into spent;
  insert into public.ai_pantry (user_id, reason, delta, coin_ledger_id)
  values (uid, 'swap', 1, spent);
  insert into public.ai_pantry (user_id, reason, delta) values (uid, 'feed', -1);
  update public.ai_energy e set level = private.ai_energy_full() where e.user_id = uid;
  return private.ai_status_json(uid);
end;
$$;

revoke all on function public.swap_and_feed_leaf() from public, anon;
grant execute on function public.swap_and_feed_leaf() to authenticated;

begin;
select plan(31);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}');

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000b2', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty_in(state public.bounty_status, with_deadline boolean default false) returns uuid
language plpgsql as $$
declare
  item uuid := gen_random_uuid();
begin
  insert into public.coin_ledger (user_id, reason, delta)
  values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 1);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  perform public.publish_bounty(
    item, '帮取快递', 'pickup', 500, starts_at => now() + interval '1 hour',
    deadline_at => case when with_deadline then now() + interval '1 day' end
  );
  if state <> 'open' then
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
    perform public.apply_to_bounty(item);
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
    perform public.select_helper(item, '00000000-0000-0000-0000-0000000000b2');
  end if;
  if state in ('en_route', 'done', 'disputed') then
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
    perform public.start_bounty(item);
  end if;
  if state in ('done', 'disputed') then
    perform public.complete_bounty(item);
  end if;
  if state = 'disputed' then
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
    perform public.report_bounty_problem(item, '没看到东西');
  end if;
  return item;
end;
$$;

create temp table fx (name text primary key, id uuid not null);
create temp table runs (name text primary key, r jsonb);
grant all on runs to service_role;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.status_of(n text) returns text language sql as $$
  select status::text from public.bounties where id = pg_temp.fx(n);
$$;

create function pg_temp.backdate(n text, published interval, expires interval) returns void language sql as $$
  update public.bounties
  set published_at = now() - published, expires_at = now() + expires,
      deadline_at = case when deadline_at is not null then now() + expires end
  where id = pg_temp.fx(n);
$$;

insert into fx
select n, pg_temp.bounty_in(s::public.bounty_status, d)
from (values
  ('free-expired', 'open', false), ('free-young', 'open', false), ('deadline-passed', 'open', true),
  ('coin-expired', 'open', false), ('deadline-future', 'open', true), ('assigned-late', 'assigned', true),
  ('remind', 'assigned', false), ('remind-future', 'assigned', false), ('remind-started', 'en_route', false),
  ('done-old', 'done', false), ('done-young', 'done', false), ('disputed-old', 'disputed', false),
  ('redo', 'done', false), ('done-broken', 'done', false)
) v (n, s, d);

select pg_temp.backdate('free-expired', interval '7 days 1 minute', interval '-1 minute');
select pg_temp.backdate('free-young', interval '6 days 23 hours', interval '1 hour');
select pg_temp.backdate('deadline-passed', interval '1 day', interval '-1 minute');
select pg_temp.backdate('coin-expired', interval '7 days 1 minute', interval '-1 minute');
select pg_temp.backdate('deadline-future', interval '8 days', interval '1 day');
select pg_temp.backdate('assigned-late', interval '8 days', interval '-1 day');
update public.bounties set starts_at = now() - interval '1 minute' where id in (pg_temp.fx('remind'), pg_temp.fx('remind-started'));
update public.bounties set done_at = now() - interval '48 hours 1 minute' where id = pg_temp.fx('done-old');
update public.bounties set done_at = now() - interval '47 hours 59 minutes' where id = pg_temp.fx('done-young');
update public.bounties set done_at = now() - interval '72 hours' where id = pg_temp.fx('disputed-old');
update public.bounties set done_at = now() - interval '72 hours' where id = pg_temp.fx('done-broken');
update public.bounties set done_at = now() - interval '47 hours' where id = pg_temp.fx('redo');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.report_bounty_problem(pg_temp.fx('redo'), '少了一样');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.complete_bounty(pg_temp.fx('redo'));
select public.open_payment(
  'bounty', pg_temp.fx('done-broken'), '帮取快递', '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000b2', 500
);

select is(
  (select array_agg(charge::text order by item_id = pg_temp.fx('coin-expired')) from public.post_charges
   where item_id in (pg_temp.fx('free-expired'), pg_temp.fx('coin-expired'))),
  array['free', 'coin'], 'one expiring bounty took a free slot and the other a coin'
);

set local role service_role;
insert into runs select 'first', public.run_bounty_jobs();
insert into runs select 'second', public.run_bounty_jobs();
reset role;

select is(
  (select r from runs where name = 'first'), '{"expired": 3, "autoConfirmed": 1, "reminded": 1}'::jsonb,
  'the first run reports what it changed'
);
select is(
  (select r from runs where name = 'second'), '{"expired": 0, "autoConfirmed": 0, "reminded": 0}'::jsonb,
  'a second run right after changes nothing'
);

select is(pg_temp.status_of('free-expired'), 'closed', 'an open bounty published 7 days and 1 minute ago closes');
select is(
  (select array_agg(concat_ws(' ', kind, from_status, to_status, coalesce(actor_id::text, 'job')))
   from public.bounty_events where bounty_id = pg_temp.fx('free-expired') and kind in ('expired', 'closed')),
  array['expired open closed job'], 'with one expired event and no actor'
);
select isnt(
  (select refunded_at from public.post_charges where item_id = pg_temp.fx('free-expired')), null,
  'its free slot comes back'
);
select is(pg_temp.status_of('free-young'), 'open', 'one published 6 days 23 hours ago stays open');
select is(pg_temp.status_of('deadline-passed'), 'closed', 'an open bounty whose deadline passed closes');
select is(pg_temp.status_of('deadline-future'), 'open', 'one with a future deadline stays open after 7 days');
select is(pg_temp.status_of('coin-expired'), 'closed', 'a coin-charged bounty expires');
select is(
  (select sum(delta) from public.coin_ledger where reason = 'post_refund' and item_id = pg_temp.fx('coin-expired')),
  1::bigint, 'and its coin comes back'
);
select is(pg_temp.status_of('assigned-late'), 'assigned', 'an assigned bounty past its deadline is untouched');

select is(pg_temp.status_of('done-old'), 'confirmed', 'a bounty done 48 hours and 1 minute ago is confirmed');
select is(
  (select array_agg(concat_ws(' ', kind, from_status, to_status, coalesce(actor_id::text, 'job')))
   from public.bounty_events where bounty_id = pg_temp.fx('done-old') and kind in ('confirmed', 'auto_confirmed')),
  array['auto_confirmed done confirmed job'], 'with one auto_confirmed event and no actor'
);
select is(
  (select array_agg(row(payer_id, payee_id, amount_sen, state::text, category::text)::text) from public.payments
   where item_kind = 'bounty' and item_id = pg_temp.fx('done-old')),
  array[row('00000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-0000000000b2'::uuid, 500, 'due',
    'pickup')::text],
  'and one due payment with the category'
);
select is(pg_temp.status_of('done-young'), 'done', 'a bounty done 47 hours 59 minutes ago stays done');
select is(pg_temp.status_of('disputed-old'), 'disputed', 'a disputed bounty is never auto-confirmed');
select is(pg_temp.status_of('redo'), 'done', 'a bounty completed again after a problem is not confirmed');
select is(
  pg_temp.status_of('done-broken'), 'done', 'a row whose confirm fails is skipped and stays done'
);
select is(
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('done-broken') and kind = 'auto_confirmed'),
  0::bigint, 'and keeps no event from the failed attempt'
);

select is(
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('remind') and kind = 'start_reminder'),
  1::bigint, 'an assigned bounty whose start passed gets one reminder over two runs'
);
select is(
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('remind-future') and kind = 'start_reminder'),
  0::bigint, 'an assigned bounty starting later gets none'
);
select is(
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('remind-started') and kind = 'start_reminder'),
  0::bigint, 'a helper who already started gets none'
);
select is(pg_temp.status_of('remind'), 'assigned', 'a reminder does not change the status');

set local role service_role;
insert into runs select 'redo', public.run_bounty_jobs(now() + interval '1 hour');
reset role;
select is(
  pg_temp.status_of('redo'), 'done', 'a run at the first done time plus 48 hours does not confirm the redone bounty'
);
select is(
  pg_temp.status_of('done-young'), 'confirmed', 'the same run confirms the bounty done 47 hours 59 minutes ago'
);
select is(
  (select r ->> 'expired' from runs where name = 'redo'), '1', 'and expires the bounty whose time came within the hour'
);

select is(
  (select schedule from cron.job where jobname = 'bounty-jobs'), '*/5 * * * *', 'bounty-jobs runs every 5 minutes'
);
select is(
  has_function_privilege('authenticated', 'public.run_bounty_jobs(timestamptz)', 'execute'), false,
  'clients cannot run the jobs'
);
select is(
  has_function_privilege('anon', 'public.run_bounty_jobs(timestamptz)', 'execute'), false, 'anon cannot run the jobs'
);
select is(
  has_function_privilege('service_role', 'public.run_bounty_jobs(timestamptz)', 'execute'), true,
  'the service role runs the jobs'
);

select * from finish();
rollback;

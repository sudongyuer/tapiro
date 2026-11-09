begin;
select plan(111);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi')) v (k, n);

create function pg_temp.uid(k text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.uid(k)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.status(k text) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(k);
  return public.ai_status();
end;
$$;

create function pg_temp.level(k text) returns integer language sql as $$
  select level from public.ai_energy where user_id = pg_temp.uid(k);
$$;

create function pg_temp.set_level(k text, value integer) returns void language sql as $$
  update public.ai_energy set level = value where user_id = pg_temp.uid(k);
$$;

create function pg_temp.begin_status(k text) returns text language sql as $$
  select public.ai_begin_call(pg_temp.uid(k)) ->> 'status';
$$;

create function pg_temp.consent(k text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(k);
  perform public.record_consent(1);
end;
$$;

create function pg_temp.meter_count(k text) returns bigint language sql as $$
  select count(*) from public.ai_metering where user_id = pg_temp.uid(k);
$$;

create function pg_temp.finish(k text, held uuid, spent integer) returns jsonb language sql as $$
  select public.ai_finish_call(pg_temp.uid(k), held, 'draft_bounty', 'fake', 3000, 600, spent);
$$;

create function pg_temp.coin_sum(k text) returns bigint language sql as $$
  select coalesce(sum(delta), 0) from public.coin_ledger where user_id = pg_temp.uid(k);
$$;

create function pg_temp.pantry_sum(k text) returns bigint language sql as $$
  select coalesce(sum(delta), 0) from public.ai_pantry where user_id = pg_temp.uid(k);
$$;

create temp table leases (name text primary key, id uuid);
grant all on leases to authenticated;

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relrowsecurity
     and c.relname in ('ai_consent_versions', 'ai_consents', 'ai_energy', 'ai_pantry', 'ai_memory', 'ai_metering')),
  6::bigint, 'every AI table has row level security on'
);
select columns_are(
  'public', 'ai_metering',
  array['id', 'user_id', 'task', 'model', 'input_tokens', 'output_tokens', 'energy_spent', 'discarded', 'created_at'],
  'metering holds no prompt or response column'
);
select is(
  (select row(schedule, command)::text from cron.job where jobname = 'ai-energy-refill-daily'),
  row('0 22 * * *', 'select public.refill_ai_energy()')::text,
  'the refill runs at 22:00 UTC, 06:00 Malaysia time'
);

-- Consent
select is(public.ai_status(), null::jsonb, 'signed out, ai_status is null');
select is(pg_temp.status('a1') #>> '{consent,given}', 'false', 'a new user has not consented');
select is((pg_temp.status('a1') ->> 'energy')::integer, 1000, 'a new user reads a full belly without a row');
select is((pg_temp.status('a1') ->> 'energyFull')::integer, 1000, 'the status names what full is');
select is((pg_temp.status('a1') ->> 'leaves')::integer, 0, 'a new user has no leaves');
select is((pg_temp.status('a1') ->> 'coins')::integer, 5, 'the status carries the coin balance');
select is(
  (pg_temp.status('a1') ->> 'nextRefillAt')::timestamptz,
  ((((now() at time zone 'Asia/Kuala_Lumpur') - interval '6 hours')::date + 1)::timestamp + interval '6 hours')
    at time zone 'Asia/Kuala_Lumpur',
  'the next refill is the next 06:00 in Malaysia'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(pg_temp.status('a1')) k),
  array['coins', 'consent', 'energy', 'energyFull', 'leaves', 'nextRefillAt'],
  'the status carries exactly these keys: no tokens, no model'
);

select is(pg_temp.begin_status('a1'), 'consent_required', 'no call starts before consent');
select is(pg_temp.level('a1'), null, 'a refused call stores no energy row');

select pg_temp.act_as('a1');
select throws_ok('select public.record_consent(2)', '22023', 'stale_consent_version', 'an unknown version is refused');
select throws_ok('select public.record_consent(null)', '22023', 'stale_consent_version', 'a null version is refused');
select is(public.record_consent(1) #>> '{consent,given}', 'true', 'consent is recorded and answered by the status');
select is(
  (select row(version, provider, purpose)::text from public.ai_consents where user_id = pg_temp.uid('a1')),
  row(1, 'Alibaba Cloud Model Studio (Singapore)', 'bounty_draft,answer,translate')::text,
  'the record names the provider and purpose from the server'
);
select isnt((select accepted_at from public.ai_consents where user_id = pg_temp.uid('a1')), null, 'with a timestamp');
select lives_ok('select public.record_consent(1)', 'consenting twice is harmless');
select is(
  (select count(*) from public.ai_consents where user_id = pg_temp.uid('a1')), 1::bigint,
  'a repeat writes no second row'
);

select is(public.withdraw_consent() #>> '{consent,given}', 'false', 'withdrawing answers with the status');
select is(pg_temp.begin_status('a1'), 'consent_required', 'a withdrawn consent stops the next call');
select isnt(
  (select withdrawn_at from public.ai_consents where user_id = pg_temp.uid('a1')), null, 'the withdrawal is stamped'
);
select lives_ok('select public.withdraw_consent()', 'withdrawing twice is harmless');
select public.record_consent(1);
select is(
  (select count(*) from public.ai_consents where user_id = pg_temp.uid('a1')), 2::bigint,
  'consenting again keeps the withdrawn record'
);

-- Client access
select pg_temp.consent('b2');
select pg_temp.act_as('a1');
set local role authenticated;
select is(
  (select count(*) from public.ai_consents), 2::bigint, 'a client reads only its own consents'
);
select throws_ok(
  $$insert into public.ai_consents (user_id, version, provider, purpose) values (auth.uid(), 1, 'x', 'y')$$,
  '42501', null, 'a client cannot write a consent'
);
select throws_ok('select * from public.ai_energy', '42501', null, 'a client cannot read energy directly');
select throws_ok('select * from public.ai_metering', '42501', null, 'a client cannot read tokens');
select throws_ok(
  $$insert into public.ai_pantry (user_id, reason, delta) values (auth.uid(), 'feed', -1)$$,
  '42501', null, 'a client cannot write the pantry'
);
select throws_ok(
  $$select public.ai_begin_call('00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'a client cannot start a metered call'
);
select throws_ok(
  $$select public.ai_finish_call('00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'answer', 'x', 0, 0, 0)$$,
  '42501', null, 'a client cannot meter a call'
);
select throws_ok(
  $$select public.ai_abort_call('00000000-0000-0000-0000-0000000000a1', gen_random_uuid())$$,
  '42501', null, 'a client cannot release a lease'
);
select throws_ok(
  $$select public.ai_discard_call('00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'answer', 'x', 0, 0)$$,
  '42501', null, 'a client cannot record a discard'
);
select throws_ok('select public.refill_ai_energy()', '42501', null, 'a client cannot run the refill');
reset role;
set local role anon;
select throws_ok('select public.ai_status()', '42501', null, 'anon cannot read a status');
select throws_ok('select public.swap_coin_for_leaf()', '42501', null, 'anon cannot swap');
reset role;

-- Calls, leases and the overdraw rule
insert into leases select 'one', (public.ai_begin_call(pg_temp.uid('a1')) ->> 'lease')::uuid;
select isnt((select id from leases where name = 'one'), null, 'a consented user with energy gets a lease');
select is(pg_temp.begin_status('a1'), 'busy', 'a second call waits while the first holds the lease');
select is(pg_temp.begin_status('b2'), 'ok', 'another user is not held up');

select public.ai_abort_call(pg_temp.uid('a1'), (select id from leases where name = 'one'));
select is(pg_temp.level('a1'), 1000, 'a failed call deducts nothing');
select is(pg_temp.meter_count('a1'), 0::bigint, 'a failed call meters nothing');

insert into leases select 'two', (public.ai_begin_call(pg_temp.uid('a1')) ->> 'lease')::uuid;
select isnt((select id from leases where name = 'two'), null, 'the abort released the lease');
update public.ai_energy set lease_until = now() - interval '1 second' where user_id = pg_temp.uid('a1');
insert into leases select 'three', (public.ai_begin_call(pg_temp.uid('a1')) ->> 'lease')::uuid;
select isnt((select id from leases where name = 'three'), null, 'an expired lease does not block for ever');

select is(
  (pg_temp.finish('a1', (select id from leases where name = 'two'), 334) ->> 'energy')::integer, 666,
  'a call that finishes late still deducts'
);
select is(pg_temp.begin_status('a1'), 'busy', 'a late finish leaves the newer lease alone');
select is(
  (select row(task, model, input_tokens, output_tokens, energy_spent)::text from public.ai_metering
   where user_id = pg_temp.uid('a1')),
  row('draft_bounty', 'fake', 3000, 600, 334)::text,
  'a finished call leaves one metering row'
);
select pg_temp.finish('a1', (select id from leases where name = 'three'), 0);
select is((select lease from public.ai_energy where user_id = pg_temp.uid('a1')), null, 'finishing frees the lease');

select pg_temp.set_level('a1', 1);
select is(pg_temp.begin_status('a1'), 'ok', 'a call starts while any energy is left');
select is(
  (pg_temp.finish('a1', (select lease from public.ai_energy where user_id = pg_temp.uid('a1')), 334) ->> 'energy')::integer,
  0, 'energy floors at 0 and the overdrawn answer is not cut off'
);
select is(pg_temp.begin_status('a1'), 'hungry', 'an empty belly starts no call');

-- Discarded replies
select pg_temp.set_level('b2', 500);
update public.ai_energy set lease = null, lease_until = null where user_id = pg_temp.uid('b2');
insert into leases select 'discard', (public.ai_begin_call(pg_temp.uid('b2')) ->> 'lease')::uuid;
select public.ai_discard_call(pg_temp.uid('b2'), (select id from leases where name = 'discard'), 'answer', 'fake', 10, 20);
select is(pg_temp.level('b2'), 500, 'a discarded reply deducts nothing');
select is((select lease from public.ai_energy where user_id = pg_temp.uid('b2')), null, 'and frees the lease');
select is(
  (select row(input_tokens, output_tokens, energy_spent, discarded)::text from public.ai_metering
   where user_id = pg_temp.uid('b2')),
  row(10, 20, 0, true)::text, 'its tokens are still recorded'
);
insert into public.ai_metering (user_id, task, model, input_tokens, output_tokens, energy_spent, discarded)
select pg_temp.uid('b2'), 'answer', 'fake', 0, 0, 0, true from generate_series(1, 18);
select is(pg_temp.begin_status('b2'), 'ok', 'after 19 discards in a day a call still starts');
select public.ai_abort_call(pg_temp.uid('b2'), (select lease from public.ai_energy where user_id = pg_temp.uid('b2')));
insert into public.ai_metering (user_id, task, model, input_tokens, output_tokens, energy_spent, discarded)
values (pg_temp.uid('b2'), 'answer', 'fake', 0, 0, 0, true);
select is(pg_temp.begin_status('b2'), 'too_many_discards', 'the 20th stops further calls');
select is(pg_temp.level('b2'), 500, 'with the energy untouched');
update public.ai_metering set created_at = (private.ai_refill_day(now())::timestamp + interval '6 hours')
    at time zone 'Asia/Kuala_Lumpur' - interval '1 second'
  where user_id = pg_temp.uid('b2');
select is(pg_temp.begin_status('b2'), 'ok', 'discards from before 06:00 do not count');
select public.ai_abort_call(pg_temp.uid('b2'), (select lease from public.ai_energy where user_id = pg_temp.uid('b2')));
select throws_ok(
  $$insert into public.ai_metering (user_id, task, model, input_tokens, output_tokens, energy_spent, discarded)
    values ('00000000-0000-0000-0000-0000000000b2', 'answer', 'fake', 0, 0, 1, true)$$,
  '23514', null, 'a discarded reply cannot carry a charge'
);

-- The 06:00 refill
select is(private.ai_refill_day('2026-11-09 05:59:59+08'), date '2026-11-08', 'before 06:00 is still yesterday');
select is(private.ai_refill_day('2026-11-09 06:00:00+08'), date '2026-11-09', 'at 06:00 a new day starts');
select is(private.ai_refill_day('2026-11-08 22:00:00+00'), date '2026-11-09', 'the job time falls on the new day');

update public.ai_energy set level = 0, refilled_on = date '2026-11-08' where user_id = pg_temp.uid('a1');
update public.ai_energy set level = 500, refilled_on = date '2026-11-08' where user_id = pg_temp.uid('b2');
select is(private.refill_ai_energy('2026-11-09 05:59:59+08'), 0, 'nothing refills a second before 06:00');
select is(pg_temp.level('a1'), 0, 'still empty before 06:00');
select is(private.refill_ai_energy('2026-11-09 06:00:00+08'), 2, 'at 06:00 every stale belly refills');
select is(pg_temp.level('a1'), 1000, 'an empty belly is full again');
select is(pg_temp.level('b2'), 1000, 'unused energy does not carry over: the belly resets to full, no more');
update public.ai_energy set level = 100 where user_id = pg_temp.uid('a1');
select is(private.refill_ai_energy('2026-11-09 06:05:00+08'), 0, 'a second run that day refills nothing');
select is(pg_temp.level('a1'), 100, 'energy spent after the refill stays spent');

update public.ai_energy set level = 0, refilled_on = private.ai_refill_day(now()) - 1 where user_id = pg_temp.uid('a1');
select is((pg_temp.status('a1') ->> 'energy')::integer, 1000, 'a missed job still reads as refilled');
select is(pg_temp.begin_status('a1'), 'ok', 'a missed job does not leave anyone hungry');
select is(pg_temp.level('a1'), 1000, 'the call applied the missed refill');
select public.ai_abort_call(pg_temp.uid('a1'), (select lease from public.ai_energy where user_id = pg_temp.uid('a1')));

-- Pantry
select pg_temp.set_level('a1', 200);
select pg_temp.act_as('a1');
select throws_ok('select public.feed_leaf()', '55000', 'no_leaf', 'nothing to feed with an empty pantry');
select is(pg_temp.level('a1'), 200, 'a refused feed changes nothing');

select is((public.swap_coin_for_leaf() ->> 'leaves')::integer, 1, 'one coin buys one leaf');
select is(pg_temp.coin_sum('a1'), 4::bigint, 'the coin is spent');
select is(
  (select row(l.reason, l.delta, p.reason, p.delta)::text
   from public.ai_pantry p join public.coin_ledger l on l.id = p.coin_ledger_id
   where p.user_id = pg_temp.uid('a1')),
  row('pantry_swap'::public.coin_reason, -1, 'swap'::public.ai_pantry_reason, 1)::text,
  'the pantry entry points at its pantry_swap ledger row'
);
select is(pg_temp.level('a1'), 200, 'swapping does not feed');

select is((public.feed_leaf() ->> 'energy')::integer, 1000, 'feeding refills to full');
select is(pg_temp.pantry_sum('a1'), 0::bigint, 'the leaf is eaten');
select throws_ok('select public.feed_leaf()', '55000', 'already_full', 'a full belly refuses before checking the pantry');

select public.swap_coin_for_leaf();
select throws_ok('select public.feed_leaf()', '55000', 'already_full', 'a full belly does not waste a leaf');
select is(pg_temp.pantry_sum('a1'), 1::bigint, 'the leaf is still there');

update public.ai_energy set level = 0, refilled_on = date '2026-11-08' where user_id = pg_temp.uid('a1');
select private.refill_ai_energy(now());
select is(pg_temp.pantry_sum('a1'), 1::bigint, 'a refill does not touch the pantry: leaves never expire');

select pg_temp.set_level('a1', 0);
select public.feed_leaf();
select public.swap_coin_for_leaf();
select pg_temp.set_level('a1', 0);
select lives_ok('select public.feed_leaf()', 'no ceiling on feeding in a day while question 149 is open');
select is(pg_temp.level('a1'), 1000, 'the second feed of the day refills too');

create function pg_temp.reject_pantry() returns trigger language plpgsql as $$
begin
  raise exception 'pantry_down';
end;
$$;
create trigger reject_pantry before insert on public.ai_pantry
  for each row execute function pg_temp.reject_pantry();
select throws_ok('select public.swap_coin_for_leaf()', 'P0001', 'pantry_down', 'a failed pantry write fails the swap');
select is(pg_temp.coin_sum('a1'), 2::bigint, 'and spends no coin: both rows share one transaction');
drop trigger reject_pantry on public.ai_pantry;

select public.spend_post(pg_temp.uid('c3'), 'bounty', gen_random_uuid());
select pg_temp.act_as('c3');
insert into public.coin_ledger (user_id, reason, delta)
values (pg_temp.uid('c3'), 'post_spend', -(select pg_temp.coin_sum('c3'))::integer);
select throws_ok('select public.swap_coin_for_leaf()', '55000', 'no_balance', 'no coin, no leaf');
select is(pg_temp.pantry_sum('c3'), 0::bigint, 'a refused swap adds no leaf');
select is(pg_temp.coin_sum('c3'), 0::bigint, 'a refused swap writes no ledger row');

select throws_ok(
  $$update public.ai_pantry set delta = 1 where reason = 'feed'$$, '55000', 'ledger_is_append_only',
  'the pantry cannot be rewritten, even by the owner'
);
select throws_ok(
  'delete from public.ai_pantry', '55000', 'ledger_is_append_only', 'the pantry cannot be deleted from'
);

-- 小貘记得
select pg_temp.act_as('a1');
set local role authenticated;
insert into public.ai_memory (kind, content) values ('place', '宿舍 Sunway Geo');
select is((select count(*) from public.ai_memory), 1::bigint, 'the owner reads its entry');
select is(
  (select user_id from public.ai_memory), pg_temp.uid('a1'), 'an entry belongs to whoever wrote it'
);
select throws_ok(
  $$insert into public.ai_memory (user_id, kind, content)
    values ('00000000-0000-0000-0000-0000000000b2', 'place', 'x')$$,
  '42501', null, 'a client cannot write into another user''s memory'
);
select throws_ok(
  $$insert into public.ai_memory (kind, content) values ('place', '   ')$$, '23514', null, 'a blank entry is refused'
);
select pg_temp.act_as('b2');
select is((select count(*) from public.ai_memory), 0::bigint, 'another user sees nothing');
delete from public.ai_memory;
update public.ai_memory set content = 'changed';
select pg_temp.act_as('a1');
select is((select content from public.ai_memory), '宿舍 Sunway Geo', 'another user cannot change or delete it');
update public.ai_memory set content = '宿舍 Sunway Pyramid';
select is((select content from public.ai_memory), '宿舍 Sunway Pyramid', 'the owner can change it');
delete from public.ai_memory;
select is((select count(*) from public.ai_memory), 0::bigint, 'the owner can delete it');
insert into public.ai_memory (kind, content) values ('preference', '不吃辣');
reset role;
set local role anon;
select throws_ok('select * from public.ai_memory', '42501', null, 'anon cannot read memory');
reset role;

-- A new consent version asks again
insert into public.ai_consent_versions (version, provider, purpose)
values (2, 'Alibaba Cloud Model Studio (Singapore)', 'bounty_draft,answer,translate,receipt_split');
select is(pg_temp.status('b2') #>> '{consent,given}', 'false', 'a new consent version asks again');
select is((pg_temp.status('b2') #>> '{consent,currentVersion}')::integer, 2, 'the status names the version to show');
select is(pg_temp.begin_status('b2'), 'consent_required', 'and gates the call');
select pg_temp.act_as('b2');
select throws_ok('select public.record_consent(1)', '22023', 'stale_consent_version', 'the old screen cannot consent');
select is(public.record_consent(2) #>> '{consent,given}', 'true', 'the new version can');

-- Deleting the account
insert into public.ai_memory (user_id, kind, content) values (pg_temp.uid('d4'), 'place', 'x');
select pg_temp.act_as('d4');
select public.record_consent(2);
select public.ai_begin_call(pg_temp.uid('d4'));
select pg_temp.finish('d4', gen_random_uuid(), 1);
select pg_temp.act_as('d4');
select public.swap_coin_for_leaf();
create temp table before_delete as
  select (select count(*) from public.ai_metering where user_id is null) as meters,
         (select count(*) from public.ai_pantry where user_id is null) as leaves;
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4'$$, 'an account with AI rows deletes'
);
select is(
  (select count(*) from public.ai_consents where user_id = pg_temp.uid('d4'))
    + (select count(*) from public.ai_energy where user_id = pg_temp.uid('d4'))
    + (select count(*) from public.ai_memory where user_id = pg_temp.uid('d4')),
  0::bigint, 'consents, energy and memory go with it'
);
select is(
  (select count(*) from public.ai_metering where user_id is null) - (select meters from before_delete), 1::bigint,
  'metering stays without a user'
);
select is(
  (select count(*) from public.ai_pantry where user_id is null) - (select leaves from before_delete), 1::bigint,
  'the pantry ledger stays without a user'
);

select * from finish();
rollback;

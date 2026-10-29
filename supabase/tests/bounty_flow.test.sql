begin;
select plan(104);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}');

insert into public.payee_methods (user_id, type)
values
  ('00000000-0000-0000-0000-0000000000b2', 'cash'),
  ('00000000-0000-0000-0000-0000000000d4', 'cash'),
  ('00000000-0000-0000-0000-0000000000e5', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.who(uid uuid) returns text language sql as $$
  select case uid
    when '00000000-0000-0000-0000-0000000000a1' then 'A'
    when '00000000-0000-0000-0000-0000000000b2' then 'B'
    when '00000000-0000-0000-0000-0000000000d4' then 'D'
    else coalesce(uid::text, '-')
  end;
$$;

create function pg_temp.bounty_in(state public.bounty_status) returns uuid language plpgsql as $$
declare
  item uuid := gen_random_uuid();
begin
  insert into public.coin_ledger (user_id, reason, delta)
  values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 1);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  perform public.publish_bounty(item, '帮取快递', 'pickup', 500, 'MYR');
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  perform public.apply_to_bounty(item, '我可以');
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
  perform public.apply_to_bounty(item);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  if state = 'closed' then
    perform public.close_bounty(item);
  elsif state <> 'open' then
    perform public.select_helper(item, '00000000-0000-0000-0000-0000000000b2');
  end if;
  if state = 'cancelled' then
    update public.bounties set status = 'cancelled' where id = item;
  elsif state in ('en_route', 'done', 'disputed', 'confirmed') then
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
    perform public.start_bounty(item);
    if state <> 'en_route' then
      perform public.complete_bounty(item);
      perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
      if state = 'disputed' then
        perform public.report_bounty_problem(item, '没看到东西');
      elsif state = 'confirmed' then
        perform public.confirm_bounty(item);
      end if;
    end if;
  end if;
  return item;
end;
$$;

create temp table fx (name text primary key, id uuid not null);
create temp table results (name text primary key, r jsonb);
grant all on fx, results to authenticated;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.step(n text, item text, actor uuid, call text) returns text[] language plpgsql as $$
declare
  mark bigint := coalesce((select max(id) from public.bounty_events), 0);
  answer jsonb;
begin
  perform pg_temp.act_as(actor);
  execute format('select ' || call, pg_temp.fx(item)) into answer;
  insert into results values (n, answer);
  return (
    select array_agg(concat_ws(' ', kind, from_status, to_status, pg_temp.who(actor_id)) order by id)
    from public.bounty_events where bounty_id = pg_temp.fx(item) and id > mark
  );
end;
$$;

create function pg_temp.status_of(n text) returns text language sql as $$
  select status::text from public.bounties where id = pg_temp.fx(n);
$$;

insert into fx
select s::text, pg_temp.bounty_in(s)
from unnest(array['open', 'assigned', 'en_route', 'done', 'disputed', 'closed', 'cancelled']::public.bounty_status[]) s;
insert into fx
select n, pg_temp.bounty_in(s::public.bounty_status)
from (values
  ('select', 'open'), ('select-block', 'open'), ('select-expired', 'open'), ('start', 'assigned'),
  ('eta', 'assigned'), ('complete', 'en_route'), ('dispute', 'done'), ('confirm', 'done'),
  ('confirm-disputed', 'disputed'), ('confirm-after-job', 'done')
) v (n, s);
insert into fx values ('confirmed', pg_temp.bounty_in('confirmed'));

create temp table before_loop as
select name, (select count(*) from public.bounty_events e where e.bounty_id = fx.id) as events
from fx where name in ('open', 'assigned', 'en_route', 'done', 'disputed', 'confirmed', 'closed', 'cancelled');

select is(
  (select array_agg(pg_temp.status_of(name) order by name) from before_loop),
  array['assigned', 'cancelled', 'closed', 'confirmed', 'disputed', 'done', 'en_route', 'open'],
  'the helper drives a fresh bounty to each status'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx(s), '00000000-0000-0000-0000-0000000000d4'),
  '55000', case when s in ('closed', 'cancelled') then 'closed' else 'taken' end,
  format('select_helper on %s is rejected', s)
)
from unnest(array['assigned', 'en_route', 'done', 'disputed', 'confirmed', 'closed', 'cancelled']) s;
select throws_ok(
  format('select public.report_bounty_problem(%L, %L)', pg_temp.fx(s), '没看到'), '55000', 'invalid_transition',
  format('report_bounty_problem on %s is rejected', s)
)
from unnest(array['open', 'assigned', 'en_route', 'confirmed', 'closed', 'cancelled']) s;
select throws_ok(
  format('select public.confirm_bounty(%L)', pg_temp.fx(s)), '55000', 'invalid_transition',
  format('confirm_bounty on %s is rejected', s)
)
from unnest(array['open', 'assigned', 'en_route', 'closed', 'cancelled']) s;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  format('select public.start_bounty(%L)', pg_temp.fx(s)), '55000', 'invalid_transition',
  format('start_bounty on %s is rejected', s)
)
from unnest(array['open', 'done', 'disputed', 'confirmed', 'closed', 'cancelled']) s;
select throws_ok(
  format('select public.update_eta(%L, %L)', pg_temp.fx(s), now() + interval '1 hour'), '55000', 'invalid_transition',
  format('update_eta on %s is rejected', s)
)
from unnest(array['open', 'assigned', 'done', 'disputed', 'confirmed', 'closed', 'cancelled']) s;
select throws_ok(
  format('select public.complete_bounty(%L)', pg_temp.fx(s)), '55000', 'invalid_transition',
  format('complete_bounty on %s is rejected', s)
)
from unnest(array['open', 'assigned', 'confirmed', 'closed', 'cancelled']) s;
reset role;

select is(
  (select array_agg(row(pg_temp.status_of(b.name), (select count(*) from public.bounty_events e
     where e.bounty_id = pg_temp.fx(b.name)))::text order by b.name) from before_loop b),
  (select array_agg(row(b.name, b.events)::text order by b.name) from before_loop b),
  'every rejected call leaves the status and the events unchanged'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('open'), '00000000-0000-0000-0000-0000000000b2'),
  '42501', 'not_poster', 'an applicant cannot select a helper'
);
select throws_ok(
  format('select public.confirm_bounty(%L)', pg_temp.fx('done')), '42501', 'not_poster', 'the helper cannot confirm'
);
select throws_ok(
  format('select public.report_bounty_problem(%L, %L)', pg_temp.fx('done'), '假的'),
  '42501', 'not_poster', 'the helper cannot report a problem'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  format('select public.start_bounty(%L)', pg_temp.fx('assigned')), '42501', 'not_helper',
  'an applicant who was not selected cannot start'
);
select throws_ok(
  format('select public.update_eta(%L, %L)', pg_temp.fx('en_route'), now() + interval '1 hour'),
  '42501', 'not_helper', 'another user cannot change the eta'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.complete_bounty(%L)', pg_temp.fx('en_route')), '42501', 'not_helper',
  'the poster cannot complete'
);
select throws_ok(
  format('select public.confirm_bounty(%L)', gen_random_uuid()), 'P0002', 'bounty_not_found',
  'an unknown bounty is not found'
);
reset role;
select is(
  (select array_agg(pg_temp.status_of(n) order by n) from unnest(array['assigned', 'done', 'en_route', 'open']) n),
  array['assigned', 'done', 'en_route', 'open'], 'wrong-actor calls leave the status'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select public.apply_to_bounty(pg_temp.fx('select'));
select public.withdraw_application(pg_temp.fx('select'));
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select'), '00000000-0000-0000-0000-0000000000e5'),
  '55000', 'not_pending', 'an applicant who withdrew cannot be selected'
);
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select'), '00000000-0000-0000-0000-0000000000c3'),
  '55000', 'not_pending', 'someone who never applied cannot be selected'
);
select is(
  pg_temp.step('select', 'select', '00000000-0000-0000-0000-0000000000a1',
    'public.select_helper(%L, ''00000000-0000-0000-0000-0000000000b2'')'),
  array['selected open assigned A'], 'selecting writes one selected event from open to assigned by the poster'
);
select is(
  (select r from results where name = 'select'),
  jsonb_build_object('status', 'assigned', 'helperId', '00000000-0000-0000-0000-0000000000b2'),
  'selecting answers assigned with the helper'
);
select is(
  (select array_agg(pg_temp.who(applicant_id) || ' ' || status order by applicant_id) from public.bounty_applications
   where bounty_id = pg_temp.fx('select')),
  array['B selected', 'D not_selected', '00000000-0000-0000-0000-0000000000e5 withdrawn'],
  'the chosen application is selected, the other pending one not selected, the withdrawn one stays withdrawn'
);
select is(
  (select row(status::text, pg_temp.who(helper_id))::text from public.bounties where id = pg_temp.fx('select')),
  row('assigned', 'B')::text, 'the bounty is assigned to the helper'
);
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select'), '00000000-0000-0000-0000-0000000000d4'),
  '55000', 'taken', 'selecting another applicant afterwards is taken'
);
select is(
  pg_temp.step('select-replay', 'select', '00000000-0000-0000-0000-0000000000a1',
    'public.select_helper(%L, ''00000000-0000-0000-0000-0000000000b2'')'),
  null, 'replaying the selection writes nothing'
);
select is(
  (select r from results where name = 'select-replay'), (select r from results where name = 'select'),
  'replaying the selection returns the same answer'
);

insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select-block'), '00000000-0000-0000-0000-0000000000d4'),
  '55000', 'not_pending', 'an applicant who blocked the poster since applying looks like one who is no longer pending'
);
delete from public.blocks;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select-block'), '00000000-0000-0000-0000-0000000000d4'),
  '42501', 'blocked', 'an applicant the poster blocked since applying cannot be selected'
);
delete from public.blocks;
delete from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000d4';
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select-block'), '00000000-0000-0000-0000-0000000000d4'),
  '55000', 'no_payee_method', 'an applicant who removed every payee method since applying cannot be selected'
);
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000d4', 'cash');
update public.bounties set expires_at = now() - interval '1 minute' where id = pg_temp.fx('select-expired');
select throws_ok(
  format('select public.select_helper(%L, %L)', pg_temp.fx('select-expired'), '00000000-0000-0000-0000-0000000000b2'),
  '55000', 'closed', 'an open bounty past its expiry is closed'
);
select is(
  array[pg_temp.status_of('select-block'), pg_temp.status_of('select-expired')], array['open', 'open'],
  'rejected selections leave the bounty open'
);

select is(
  pg_temp.step('start', 'start', '00000000-0000-0000-0000-0000000000b2', 'public.start_bounty(%L)'),
  array['started assigned en_route B'], 'starting writes one started event from assigned to en_route by the helper'
);
select is(
  (select r from results where name = 'start'), '{"status": "en_route", "etaAt": null}'::jsonb,
  'starting without an eta answers en_route'
);
select is(
  pg_temp.step('start-replay', 'start', '00000000-0000-0000-0000-0000000000b2', 'public.start_bounty(%L)'),
  null, 'replaying start writes nothing'
);
select is(
  (select r from results where name = 'start-replay'), (select r from results where name = 'start'),
  'replaying start returns the same answer'
);

create temp table times as
select date_trunc('day', now()) + interval '2 days 18 hours' as six,
       date_trunc('day', now()) + interval '2 days 18 hours 20 minutes' as twenty;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  format('select public.start_bounty(%L, %L)', pg_temp.fx('eta'), now() - interval '1 minute'),
  '22023', 'invalid_bounty', 'starting with an eta in the past is rejected'
);
select is(
  public.start_bounty(pg_temp.fx('eta'), (select six from times)),
  jsonb_build_object('status', 'en_route', 'etaAt', (select six from times)), 'starting with 18:00 answers the eta'
);
select is(
  pg_temp.step('eta', 'eta', '00000000-0000-0000-0000-0000000000b2',
    format('public.update_eta(%%L, %L)', (select twenty from times))),
  array['eta_changed en_route en_route B'], 'changing the eta writes one eta_changed event'
);
select is(
  (select r from results where name = 'eta'),
  jsonb_build_object('status', 'en_route', 'etaAt', (select twenty from times), 'previousEtaAt', (select six from times)),
  'changing the eta answers both times'
);
select is(
  (select row(b.eta_at, b.previous_eta_at, e.eta_at, e.previous_eta_at)::text
   from public.bounties b join public.bounty_events e on e.bounty_id = b.id and e.kind = 'eta_changed'
   where b.id = pg_temp.fx('eta')),
  (select row(twenty, six, twenty, six)::text from times),
  'the bounty and the event hold 18:20 and the previous 18:00'
);
select throws_ok(
  format('select public.update_eta(%L, %L)', pg_temp.fx('eta'), (select twenty from times)),
  '22023', 'invalid_bounty', 'an eta equal to the current one is rejected'
);
select throws_ok(
  format('select public.update_eta(%L, %L)', pg_temp.fx('eta'), now() - interval '1 minute'),
  '22023', 'invalid_bounty', 'an eta in the past is rejected'
);
select throws_ok(
  format('select public.update_eta(%L, null)', pg_temp.fx('eta')), '22023', 'invalid_bounty', 'a missing eta is rejected'
);

select is(
  pg_temp.step('complete', 'complete', '00000000-0000-0000-0000-0000000000b2', 'public.complete_bounty(%L)'),
  array['completed en_route done B'], 'completing writes one completed event from en_route to done by the helper'
);
select is(
  (select r from results where name = 'complete'),
  jsonb_build_object('status', 'done', 'autoConfirmAt', now() + interval '48 hours'),
  'completing answers done with the auto-confirm time'
);
select is(
  (select done_at from public.bounties where id = pg_temp.fx('complete')), now(), 'done_at is set'
);
select is(
  pg_temp.step('complete-replay', 'complete', '00000000-0000-0000-0000-0000000000b2', 'public.complete_bounty(%L)'),
  null, 'replaying complete writes nothing'
);
select is(
  (select r from results where name = 'complete-replay'), (select r from results where name = 'complete'),
  'replaying complete returns the same answer'
);
update public.bounties set done_at = now() - interval '1 hour' where id = pg_temp.fx('complete');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.complete_bounty(pg_temp.fx('complete'));
select is(
  (select done_at from public.bounties where id = pg_temp.fx('complete')), now() - interval '1 hour',
  'replaying complete does not restart the 48 hours'
);

update public.bounties set done_at = now() - interval '47 hours' where id = pg_temp.fx('dispute');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.report_bounty_problem(%L, %L)', pg_temp.fx('dispute'), '   '),
  '22023', 'invalid_reason', 'a blank reason is rejected'
);
select throws_ok(
  format('select public.report_bounty_problem(%L, null)', pg_temp.fx('dispute')),
  '22023', 'invalid_reason', 'a missing reason is rejected'
);
select throws_ok(
  format('select public.report_bounty_problem(%L, %L)', pg_temp.fx('dispute'), repeat('坏', 141)),
  '22023', 'invalid_reason', 'a 141-character reason is rejected'
);
select is(pg_temp.status_of('dispute'), 'done', 'a rejected reason leaves the bounty done');
select is(
  pg_temp.step('dispute', 'dispute', '00000000-0000-0000-0000-0000000000a1',
    format('public.report_bounty_problem(%%L, %L)', '  ' || repeat('坏', 139) || '了  ')),
  array['problem_reported done disputed A'], 'reporting writes one problem_reported event from done to disputed'
);
select is((select r from results where name = 'dispute'), '{"status": "disputed"}'::jsonb, 'reporting answers disputed');
select is(
  pg_temp.step('dispute-replay', 'dispute', '00000000-0000-0000-0000-0000000000a1',
    format('public.report_bounty_problem(%%L, %L)', '另一个原因')),
  null, 'reporting again on the disputed bounty writes nothing'
);
select is(
  (select r from results where name = 'dispute-replay'), (select r from results where name = 'dispute'),
  'reporting again returns the same answer'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select reason from public.bounty_events where bounty_id = pg_temp.fx('dispute') and kind = 'problem_reported'),
  repeat('坏', 139) || '了', 'the helper reads the trimmed reason'
);
reset role;
select is(
  pg_temp.step('redo', 'dispute', '00000000-0000-0000-0000-0000000000b2', 'public.complete_bounty(%L)'),
  array['completed disputed done B'], 'completing again writes one completed event from disputed to done'
);
select ok(
  (select done_at > now() - interval '47 hours' from public.bounties where id = pg_temp.fx('dispute')),
  'completing again sets a later done_at'
);
select ok(
  ((select r from results where name = 'redo') ->> 'autoConfirmAt')::timestamptz
    between now() + interval '47 hours 59 minutes' and now() + interval '48 hours 1 minute',
  'completing again restarts the 48 hours'
);

select is(
  pg_temp.step('confirm', 'confirm', '00000000-0000-0000-0000-0000000000a1', 'public.confirm_bounty(%L)'),
  array['confirmed done confirmed A'], 'confirming writes one confirmed event from done to confirmed by the poster'
);
select is(
  (select r from results where name = 'confirm'),
  jsonb_build_object(
    'status', 'confirmed',
    'paymentId', (select id from public.payments where item_kind = 'bounty' and item_id = pg_temp.fx('confirm'))
  ),
  'confirming answers confirmed with the payment'
);
select is(
  (select row(pg_temp.who(payer_id), pg_temp.who(payee_id), amount_minor, currency, title, category::text, state::text, reverses)::text
   from public.payments where item_kind = 'bounty' and item_id = pg_temp.fx('confirm')),
  row('A', 'B', 500, 'MYR', '帮取快递', 'pickup', 'due', null::uuid)::text,
  'one forward payment from the poster to the helper for the reward with the title and category'
);
select is(
  pg_temp.step('confirm-replay', 'confirm', '00000000-0000-0000-0000-0000000000a1', 'public.confirm_bounty(%L)'),
  null, 'replaying confirm writes no event'
);
select is(
  (select r from results where name = 'confirm-replay'), (select r from results where name = 'confirm'),
  'replaying confirm returns the same payment'
);
select is(
  (select count(*) from public.payments where item_kind = 'bounty' and item_id = pg_temp.fx('confirm')), 1::bigint,
  'replaying confirm opens no second payment'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.payments where item_id = pg_temp.fx('confirm')), 1::bigint,
  'the helper sees the payment'
);
reset role;
select is(
  pg_temp.step('confirm-disputed', 'confirm-disputed', '00000000-0000-0000-0000-0000000000a1',
    'public.confirm_bounty(%L)'),
  array['confirmed disputed confirmed A'], 'the poster can confirm from disputed'
);
select is(
  (select count(*) from public.payments where item_kind = 'bounty' and item_id = pg_temp.fx('confirm-disputed')),
  1::bigint, 'confirming from disputed opens one payment'
);

select private.confirm_bounty(pg_temp.fx('confirm-after-job'), null);
select is(
  pg_temp.step('confirm-after-job', 'confirm-after-job', '00000000-0000-0000-0000-0000000000a1',
    'public.confirm_bounty(%L)'),
  null, 'the poster confirming after the auto-confirm writes no event'
);
select is(
  (select r from results where name = 'confirm-after-job'),
  jsonb_build_object(
    'status', 'confirmed',
    'paymentId', (select id from public.payments where item_kind = 'bounty' and item_id = pg_temp.fx('confirm-after-job'))
  ),
  'and is answered confirmed with the payment the job opened'
);

select throws_ok(
  format('select private.confirm_bounty(%L, null)', pg_temp.fx('disputed')), '55000', 'invalid_transition',
  'a disputed bounty is never confirmed without the poster'
);

select is(
  has_function_privilege('anon', 'public.confirm_bounty(uuid)', 'execute'), false, 'anon cannot confirm'
);
select is(
  has_function_privilege('authenticated', 'private.confirm_bounty(uuid, uuid)', 'execute'), false,
  'clients cannot call the internal confirm'
);

select * from finish();
rollback;

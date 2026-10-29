begin;
select plan(72);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farah"}'),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'g@example.com', '{"full_name":"Gita"}');

insert into public.payee_methods (user_id, type)
values
  ('00000000-0000-0000-0000-0000000000b2', 'cash'),
  ('00000000-0000-0000-0000-0000000000d4', 'cash'),
  ('00000000-0000-0000-0000-0000000000e5', 'cash'),
  ('00000000-0000-0000-0000-0000000000a7', 'cash');

insert into public.reputation_snapshots (user_id, tier, settled_count, counterpart_count, counted_no_shows, computed_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'reliable', 2, 2, 0, now()),
  ('00000000-0000-0000-0000-0000000000b2', 'very_reliable', 5, 4, 0, now());

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create temp table fx (name text primary key, id uuid not null);
grant all on fx to authenticated;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.post(n text, poster text default 'a1', applicants text[] default array['b2', 'd4'])
returns uuid language plpgsql as $$
declare
  item uuid := gen_random_uuid();
  applicant text;
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u(poster), 'help_settled', 1);
  perform pg_temp.act_as(pg_temp.u(poster));
  perform public.publish_bounty(item, '帮取快递', 'pickup', 500, null, 'KL Sentral', 3.1340, 101.6860, 'Block C, 3-2');
  foreach applicant in array applicants loop
    perform pg_temp.act_as(pg_temp.u(applicant));
    perform public.apply_to_bounty(item, case applicant when 'b2' then '我可以' when 'd4' then '我也行' end);
  end loop;
  insert into fx values (n, item);
  return item;
end;
$$;

create function pg_temp.drive(item uuid, state public.bounty_status, poster text default 'a1', helper text default 'b2')
returns uuid language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u(poster));
  perform public.select_helper(item, pg_temp.u(helper));
  if state in ('en_route', 'done', 'disputed', 'confirmed') then
    perform pg_temp.act_as(pg_temp.u(helper));
    perform public.start_bounty(item, now() + interval '20 minutes');
    if state <> 'en_route' then
      perform public.complete_bounty(item);
      perform pg_temp.act_as(pg_temp.u(poster));
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

create function pg_temp.item(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer));
  return (select x from jsonb_array_elements(public.bounty_live_items()) x where x ->> 'bountyId' = pg_temp.fx(n)::text);
  end;
$$;

create function pg_temp.shape(x jsonb) returns text language sql as $$
  select concat_ws('/', x ->> 'role', x ->> 'kind', x ->> 'action', x ->> 'card');
$$;

create function pg_temp.detail(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.bounty_detail(pg_temp.fx(n)); end;
$$;
create function pg_temp.mine(viewer text, list text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer));
  return (select x from jsonb_array_elements(public.my_bounties() -> list) x where x ->> 'id' = pg_temp.fx(n)::text);
  end;
$$;
create function pg_temp.list(viewer text, list text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.my_bounties() -> list; end;
$$;
create function pg_temp.applicants(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.bounty_applicants(pg_temp.fx(n)); end;
$$;
create function pg_temp.mark(viewer text, n text, card public.bounty_seen_card) returns void language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); perform public.mark_bounty_seen(pg_temp.fx(n), card); end;
$$;

select pg_temp.post('expiring', 'a1', array[]::text[]);
update public.bounties set expires_at = now() - interval '1 minute' where id = pg_temp.fx('expiring');
select private.run_bounty_jobs(now());
select pg_temp.post('main');
select pg_temp.post('lonely', 'a1', array[]::text[]);
select pg_temp.post('closed', 'a1', array[]::text[]);
select pg_temp.act_as(pg_temp.u('a1'));
select public.close_bounty(pg_temp.fx('closed'));
select pg_temp.post('assigned');
select pg_temp.post('en_route');
select pg_temp.post('done');
select pg_temp.post('disputed');
select pg_temp.post('confirmed');
select pg_temp.post('orphaned', 'a1', array['a7']);
select pg_temp.post('abandoned', 'f6', array['e5']);
select pg_temp.post('withdrawn', 'a1', array['b2']);
select pg_temp.act_as(pg_temp.u('b2'));
select public.withdraw_application(pg_temp.fx('withdrawn'));
select pg_temp.drive(pg_temp.fx('assigned'), 'assigned');
update public.bounties set starts_at = now() - interval '1 minute' where id = pg_temp.fx('assigned');
select pg_temp.drive(pg_temp.fx('en_route'), 'en_route');
select pg_temp.drive(pg_temp.fx('done'), 'done');
select pg_temp.drive(pg_temp.fx('disputed'), 'disputed');
select pg_temp.drive(pg_temp.fx('confirmed'), 'confirmed');
select pg_temp.drive(pg_temp.fx('orphaned'), 'confirmed', 'a1', 'a7');
select pg_temp.drive(pg_temp.fx('abandoned'), 'confirmed', 'f6', 'e5');
delete from auth.users where id in (pg_temp.u('a7'), pg_temp.u('f6'));
insert into public.post_charges (item_kind, item_id, user_id, charge, free_month)
select 'ride', gen_random_uuid(), pg_temp.u('e5'), 'free', public.malaysia_month(now()) from generate_series(1, 3);
select pg_temp.post('coin_expiring', 'e5', array[]::text[]);
update public.bounties set expires_at = now() - interval '1 minute' where id = pg_temp.fx('coin_expiring');
select private.run_bounty_jobs(now());
insert into public.bounties (id, poster_id, title, category, reward_sen, expires_at, status, status_changed_at)
select gen_random_uuid(), pg_temp.u('c3'), '旧的悬赏', 'other', 500, now(), 'closed', now() - make_interval(mins => i)
from generate_series(1, 21) as i;
insert into fx values ('old_confirmed', gen_random_uuid());
insert into public.bounties (id, poster_id, title, category, reward_sen, expires_at, status, status_changed_at)
values (pg_temp.fx('old_confirmed'), pg_temp.u('c3'), '还没付', 'other', 500, now(), 'confirmed', now() - interval '1 day');

set local role authenticated;

select is(pg_temp.detail('c3', 'main') ->> 'viewerRole', 'viewer', 'C reads an open bounty as a viewer');
select is(
  (select count(*) from jsonb_each(pg_temp.detail('c3', 'main'))
   where key in ('address', 'events', 'payment', 'helper', 'applicantCount', 'myApplication', 'issueReason')
     and jsonb_typeof(value) <> 'null'),
  0::bigint, 'a viewer gets no address, events, payment, helper, applicant count or application'
);
select is(
  pg_temp.detail('c3', 'main') -> 'place', '{"label": "KL Sentral"}'::jsonb, 'a viewer reads the place label only'
);
select is(
  pg_temp.detail('a1', 'main') -> 'place',
  '{"label": "KL Sentral", "latitude": 3.134, "longitude": 101.686}'::jsonb,
  'the poster reads the point'
);
select is(
  pg_temp.detail('c3', 'main') -> 'poster',
  jsonb_build_object('id', pg_temp.u('a1'), 'name', 'Alice Tan', 'tier', 'reliable'),
  'the poster carries name and tier'
);
select is(
  pg_temp.detail('c3', 'main') #>> '{poster,tier}', public.reputation_tier(pg_temp.u('a1'))::text,
  'poster.tier equals reputation_tier of the poster'
);
select is(
  pg_temp.detail('a1', 'main') - array['id', 'title', 'description', 'category', 'rewardSen', 'place', 'startsAt',
    'endsAt', 'deadlineAt', 'expiresAt', 'publishedAt', 'poster', 'events'],
  jsonb_build_object(
    'status', 'open', 'viewerRole', 'poster', 'distanceM', null, 'address', 'Block C, 3-2', 'helper', null,
    'myApplication', null, 'applicantCount', 2, 'charge', 'free', 'etaAt', null, 'previousEtaAt', null, 'autoConfirmAt', null, 'startLate', false,
    'issueReason', null, 'payment', null
  ),
  'the poster reads the address and the pending applicant count'
);
select is(
  (select jsonb_agg(e ->> 'kind') from jsonb_array_elements(pg_temp.detail('a1', 'main') -> 'events') e),
  '["published", "applied", "applied"]'::jsonb,
  'the poster reads the events, applications included'
);
select is(
  pg_temp.detail('b2', 'main') -> 'myApplication', '{"status": "pending", "note": "我可以"}'::jsonb,
  'an applicant reads their own application'
);
select is(
  array[pg_temp.detail('d4', 'confirmed') ->> 'payment', pg_temp.detail('d4', 'confirmed') ->> 'issueReason',
    pg_temp.detail('d4', 'confirmed') ->> 'etaAt'],
  array[null, null, null], 'a non-selected applicant gets no payment or ETA on a confirmed bounty'
);
select is(
  array[pg_temp.detail('b2', 'main') ->> 'viewerRole', pg_temp.detail('b2', 'main') ->> 'address'],
  array['applicant', null], 'an applicant gets no address before selection'
);
select throws_ok(
  $$select pg_temp.detail('c3', 'nope')$$, 'P0002', 'bounty_not_found', 'an unknown bounty is not found'
);

select is(
  pg_temp.mine('a1', 'posted', 'main') - array['id', 'title', 'category', 'rewardSen', 'placeLabel', 'startsAt',
    'deadlineAt', 'expiresAt'],
  '{"status": "open", "applicantCount": 2, "applicationStatus": null, "counterpartName": null}'::jsonb,
  'the poster''s list holds the bounty with two applicants'
);
select is(
  pg_temp.mine('b2', 'applied', 'main') ->> 'applicationStatus', 'pending', 'the applicant''s list holds it as pending'
);
select is(
  pg_temp.mine('b2', 'applied', 'main') ->> 'counterpartName', 'Alice Tan', 'the applicant''s counterpart is the poster'
);
select is(pg_temp.mine('c3', 'applied', 'main'), null, 'a user who did not apply has no applied row');
select is(
  (select count(*) from jsonb_array_elements((select public.my_bounties() -> 'posted')) x
   where x ->> 'id' = pg_temp.fx('confirmed')::text),
  0::bigint, 'another user''s posted bounty is not in C''s list'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('c3'));
select throws_ok(
  $$select pg_temp.detail('c3', 'main')$$, 'P0002', 'bounty_not_found', 'a viewer blocked by the poster sees nothing'
);

select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  format('select public.bounty_applicants(%L)', pg_temp.fx('main')),
  '42501', 'not_poster', 'an applicant cannot list the applicants'
);
select is(
  (select jsonb_agg(jsonb_build_object('id', x ->> 'applicantId', 'name', x ->> 'name', 'tier', x ->> 'tier',
     'note', x ->> 'note', 'status', x ->> 'status'))
   from jsonb_array_elements(pg_temp.applicants('a1', 'main')) x),
  jsonb_build_array(
    jsonb_build_object('id', pg_temp.u('b2'), 'name', 'Bob Lim', 'tier', public.reputation_tier(pg_temp.u('b2')),
      'note', '我可以', 'status', 'pending'),
    jsonb_build_object('id', pg_temp.u('d4'), 'name', 'Devi', 'tier', 'new_friend', 'note', '我也行', 'status', 'pending')
  ),
  'the poster lists both applicants with name, tier and note, oldest first'
);

select is(
  pg_temp.shape(pg_temp.item('a1', 'main')) || ' ' || (pg_temp.item('a1', 'main') ->> 'applicantCount'),
  'poster/bountyAction/choose 2', 'the poster of an open bounty with applicants has a choose action'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'main')) || ' ' || (pg_temp.item('b2', 'main') ->> 'status'),
  'applicant/bountyInProgress open', 'a pending application has an in-progress applicant item'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('d4'));
select is(
  (select jsonb_agg(x ->> 'applicantId') from jsonb_array_elements(pg_temp.applicants('a1', 'main')) x),
  jsonb_build_array(pg_temp.u('b2')), 'an applicant the poster blocked is not listed'
);
select is(
  array[
    (pg_temp.detail('a1', 'main') ->> 'applicantCount')::integer,
    (select count(*)::integer from jsonb_array_elements(pg_temp.detail('a1', 'main') -> 'events') e
     where e ->> 'kind' = 'applied')
  ],
  array[1, 1], 'the count and the events leave out the blocked applicant'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.unblock_user(pg_temp.u('d4'));

select pg_temp.drive(pg_temp.fx('main'), 'assigned');
select is(
  array[pg_temp.mine('d4', 'applied', 'main') ->> 'applicationStatus', pg_temp.mine('d4', 'applied', 'main') ->> 'counterpartName'],
  array['not_selected', 'Alice Tan'], 'after selection D''s row shows not_selected with the poster as counterpart'
);
select is(
  array[pg_temp.detail('d4', 'main') ->> 'helper', pg_temp.detail('d4', 'main') ->> 'events',
    pg_temp.detail('d4', 'main') #>> '{myApplication,status}'],
  array[null, null, 'not_selected'], 'a non-selected applicant gets their status but no helper or events'
);
select ok(
  position(pg_temp.u('b2')::text in pg_temp.detail('d4', 'main')::text) = 0
    and position('Bob Lim' in pg_temp.detail('d4', 'main')::text) = 0
    and position('Bob Lim' in pg_temp.item('d4', 'main')::text) = 0
    and position(pg_temp.u('b2')::text in pg_temp.mine('d4', 'applied', 'main')::text) = 0,
  'nothing a non-selected applicant reads names the helper'
);
select is(
  array[pg_temp.detail('b2', 'main') ->> 'viewerRole', pg_temp.detail('b2', 'main') ->> 'address'],
  array['helper', 'Block C, 3-2'], 'the selected helper reads the address'
);
select is(
  (select jsonb_agg(jsonb_build_array(e ->> 'kind', e ->> 'actor'))
   from jsonb_array_elements(pg_temp.detail('b2', 'main') -> 'events') e),
  '[["published", "poster"], ["applied", "helper"], ["selected", "poster"]]'::jsonb,
  'the helper reads their own application but not other applicants'''
);
select is(
  (select jsonb_agg(jsonb_build_array(e ->> 'kind', e ->> 'actor'))
   from jsonb_array_elements(pg_temp.detail('a1', 'main') -> 'events') e),
  '[["published", "poster"], ["applied", "helper"], ["applied", null], ["selected", "poster"]]'::jsonb,
  'the poster reads every event with the actor''s side'
);
select is(
  (select jsonb_agg(jsonb_build_array(x ->> 'applicantId', x ->> 'status'))
   from jsonb_array_elements(pg_temp.applicants('a1', 'main')) x),
  jsonb_build_array(jsonb_build_array(pg_temp.u('b2'), 'selected')),
  'after selection the list holds the selected helper only'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'main')) || ' ' || (pg_temp.item('b2', 'main') ->> 'startLate'),
  'helper/bountyAction/start false', 'the helper of an assigned bounty has a start action'
);

select is(
  pg_temp.shape(pg_temp.item('d4', 'main')) || ' ' || (pg_temp.item('d4', 'main') ->> 'counterpartName'),
  'applicant/oneTime/not_selected Alice Tan', 'a non-selected applicant has a one-time not_selected card'
);
select pg_temp.mark('d4', 'main', 'not_selected');
select is(pg_temp.item('d4', 'main'), null, 'the card is gone once marked seen');
select lives_ok(
  format('select public.mark_bounty_seen(%L, %L)', pg_temp.fx('main'), 'not_selected'),
  'marking the same card again is fine'
);
reset role;
set local role authenticated;
select pg_temp.act_as(pg_temp.u('d4'));
select is(
  array[
    (select count(*)::integer from public.bounty_seen where bounty_id = pg_temp.fx('main')),
    (select count(*)::integer from jsonb_array_elements(public.bounty_live_items()) x
     where x ->> 'bountyId' = pg_temp.fx('main')::text)
  ],
  array[1, 0], 'the seen flag is one server row, read again in a fresh session'
);
select throws_ok(
  format('select pg_temp.mark(%L, %L, %L)', 'b2', 'main', 'not_selected'),
  'P0002', 'bounty_not_found', 'the helper has no not_selected card to mark'
);
select throws_ok(
  format('select pg_temp.mark(%L, %L, %L)', 'a1', 'main', 'expired'),
  'P0002', 'bounty_not_found', 'a bounty that did not expire has no expired card'
);

select is(
  pg_temp.shape(pg_temp.item('a1', 'expiring')) || ' ' || (pg_temp.item('a1', 'expiring') ->> 'refund'),
  'poster/oneTime/expired free', 'an expired bounty gives the poster a one-time card with the free refund'
);
select pg_temp.mark('a1', 'expiring', 'expired');
select is(pg_temp.item('a1', 'expiring'), null, 'the expired card is gone once marked seen');
select is(pg_temp.item('a1', 'closed'), null, 'a bounty the poster closed has no card');

select is(
  pg_temp.shape(pg_temp.item('a1', 'lonely')), 'poster/bountyInProgress', 'an open bounty without applicants is in progress'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'assigned')) || ' ' || (pg_temp.item('b2', 'assigned') ->> 'startLate'),
  'helper/bountyAction/start true', 'the helper''s start is late once starts_at passed'
);
select is(
  pg_temp.shape(pg_temp.item('a1', 'assigned')) || ' ' || (pg_temp.item('a1', 'assigned') ->> 'startLate')
    || ' ' || (pg_temp.item('a1', 'assigned') ->> 'counterpartName'),
  'poster/bountyInProgress true Bob Lim', 'the poster of an assigned bounty sees it in progress, late, with the helper'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'en_route')) || ' ' || ((pg_temp.item('b2', 'en_route') ->> 'etaAt')::timestamptz = now() + interval '20 minutes'),
  'helper/bountyInProgress true', 'the helper on the way sees it in progress with the ETA'
);
select is(
  pg_temp.shape(pg_temp.item('a1', 'en_route')) || ' ' || ((pg_temp.item('a1', 'en_route') ->> 'etaAt')::timestamptz = now() + interval '20 minutes'),
  'poster/bountyInProgress true', 'the poster sees the helper on the way with the ETA'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'done')) || ' ' || ((pg_temp.item('b2', 'done') ->> 'autoConfirmAt')::timestamptz = now() + interval '48 hours'),
  'helper/bountyInProgress true', 'the helper of a done bounty waits with the auto-confirm time'
);
select is(
  pg_temp.shape(pg_temp.item('a1', 'done')) || ' ' || ((pg_temp.item('a1', 'done') ->> 'autoConfirmAt')::timestamptz = now() + interval '48 hours'),
  'poster/bountyAction/confirm true', 'the poster of a done bounty has a confirm action with the auto-confirm time'
);
select is(
  pg_temp.shape(pg_temp.item('b2', 'disputed')) || ' ' || (pg_temp.item('b2', 'disputed') ->> 'issueReason'),
  'helper/bountyAction/resolveIssue 没看到东西', 'the helper of a disputed bounty has a resolve action with the reason'
);
select is(
  pg_temp.shape(pg_temp.item('a1', 'disputed')) || ' ' || (pg_temp.item('a1', 'disputed') ->> 'issueReason'),
  'poster/bountyInProgress 没看到东西', 'the poster of a disputed bounty sees it in progress with the reason'
);
select is(
  array[pg_temp.item('a1', 'confirmed'), pg_temp.item('b2', 'confirmed')], array[null, null]::jsonb[],
  'a confirmed bounty has no bounty item for either side'
);

select is(
  array[pg_temp.detail('a1', 'confirmed') ->> 'status', pg_temp.detail('a1', 'confirmed') #>> '{payment,state}'],
  array['confirmed', 'due'], 'a confirmed bounty with an open payment reads confirmed'
);
insert into fx values ('payment', (pg_temp.detail('a1', 'confirmed') #>> '{payment,id}')::uuid);
select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received(pg_temp.fx('payment'));
select is(
  array[pg_temp.detail('a1', 'confirmed') ->> 'status', pg_temp.detail('a1', 'confirmed') #>> '{payment,state}'],
  array['settled', 'settled'], 'after the helper settles the payment the bounty reads settled'
);
select is(
  array[pg_temp.mine('a1', 'posted', 'confirmed') ->> 'status', pg_temp.mine('b2', 'applied', 'confirmed') ->> 'status'],
  array['settled', 'settled'], 'both lists read settled'
);
select is(
  array[pg_temp.detail('d4', 'confirmed') ->> 'status', pg_temp.mine('d4', 'applied', 'confirmed') ->> 'status',
    pg_temp.item('d4', 'confirmed') ->> 'status'],
  array['confirmed', 'confirmed', 'confirmed'], 'a non-selected applicant never reads settled'
);
select is(
  array[pg_temp.detail('d4', 'done') ->> 'autoConfirmAt', pg_temp.item('d4', 'done') ->> 'autoConfirmAt',
    pg_temp.detail('d4', 'assigned') ->> 'startLate', pg_temp.item('d4', 'assigned') ->> 'startLate'],
  array[null, null, 'false', 'false'], 'a non-selected applicant gets no auto-confirm time or late start'
);
select is(
  pg_temp.shape(pg_temp.item('d4', 'done')), 'applicant/oneTime/not_selected', 'D has a not_selected card on done'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('d4'));
select is(pg_temp.item('d4', 'done'), null, 'a not-selected applicant the poster blocked loses the card');
select throws_ok(
  format('select pg_temp.mark(%L, %L, %L)', 'd4', 'done', 'not_selected'),
  'P0002', 'bounty_not_found', 'a blocked applicant cannot mark the card'
);
select is(
  pg_temp.item('e5', 'coin_expiring') ->> 'refund', 'coin', 'an expired coin post shows the coin refund'
);
select is(
  (select count(*) from jsonb_array_elements(pg_temp.list('c3', 'posted')) x where x ->> 'status' = 'closed'),
  20::bigint, 'the posted list keeps only the 20 most recent terminal bounties'
);
select is(
  (select x ->> 'status' from jsonb_array_elements(pg_temp.list('c3', 'posted')) x
   where x ->> 'id' = pg_temp.fx('old_confirmed')::text),
  'confirmed', 'a confirmed bounty not yet settled stays in the list past the cap'
);
select is(pg_temp.mine('b2', 'applied', 'withdrawn'), null, 'a withdrawn application is not in the applied list');
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select status::text from public.bounties where id = pg_temp.fx('confirmed')), 'confirmed',
  'the stored status stays confirmed'
);
reset role;
select results_eq(
  format(
    $$select owner_id, category::text from public.stickers
      where payment_id = %L order by owner_id$$,
    pg_temp.fx('payment')
  ),
  $$values ('00000000-0000-0000-0000-0000000000a1'::uuid, 'pickup'), ('00000000-0000-0000-0000-0000000000b2'::uuid, 'pickup')$$,
  'the poster and the helper each own one sticker with the bounty''s category'
);
set local role authenticated;

select is(
  array[pg_temp.detail('e5', 'abandoned') ->> 'viewerRole', pg_temp.detail('e5', 'abandoned') ->> 'poster',
    pg_temp.detail('e5', 'abandoned') ->> 'status'],
  array['helper', null, 'confirmed'], 'a helper reads a confirmed bounty whose poster deleted their account'
);
select is(
  array[pg_temp.mine('e5', 'applied', 'abandoned') ->> 'applicationStatus',
    pg_temp.mine('e5', 'applied', 'abandoned') ->> 'counterpartName'],
  array['selected', null], 'the helper''s list keeps the bounty with no counterpart'
);
select is(
  array[pg_temp.detail('a1', 'orphaned') ->> 'helper', pg_temp.detail('a1', 'orphaned') ->> 'status',
    pg_temp.mine('a1', 'posted', 'orphaned') ->> 'counterpartName'],
  array[null, 'confirmed', null], 'a poster reads a confirmed bounty whose helper deleted their account'
);

select throws_ok(
  format('select pg_temp.mark(%L, %L, %L)', 'e5', 'lonely', 'not_selected'),
  'P0002', 'bounty_not_found', 'a viewer who never applied has no card to mark'
);
select pg_temp.act_as(pg_temp.u('e5'));
select public.block_user(pg_temp.u('a1'));
select throws_ok(
  $$select pg_temp.detail('e5', 'lonely')$$, 'P0002', 'bounty_not_found', 'a viewer who blocked the poster sees nothing'
);

reset role;
create temp table fns as select unnest(array['public.bounty_detail(uuid, double precision, double precision)',
  'public.my_bounties()', 'public.bounty_applicants(uuid)', 'public.bounty_live_items()', 'public.mark_bounty_seen(uuid, public.bounty_seen_card)']) f;
select is(
  (select count(*) from fns where has_function_privilege('anon', f, 'execute')), 0::bigint,
  'anon cannot execute any read function'
);
select is(
  (select count(*) from fns where has_function_privilege('authenticated', f, 'execute')), 5::bigint,
  'a signed-in client executes all five'
);

select * from finish();
rollback;

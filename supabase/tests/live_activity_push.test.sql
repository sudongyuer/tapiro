begin;
select plan(37);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.u(k)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.anon() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', true),
         set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('43000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.key(n integer) returns text language sql as $$
  select repeat(lpad(to_hex(n), 2, '0'), 32);
$$;

create function pg_temp.work(k text) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.claim_live_activity_work(50)) x where x ->> 'userId' = pg_temp.u(k)::text;
$$;

create function pg_temp.en_route(n integer) returns void language plpgsql as $$
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
  perform pg_temp.act_as('a1');
  perform public.publish_bounty(
    pg_temp.b(n), '帮取快递', 'pickup', 500, 'MYR', null, 'KL Sentral', 3.1340, 101.6860, 'Block C, 3-2'
  );
  perform pg_temp.act_as('b2');
  perform public.apply_to_bounty(pg_temp.b(n));
  perform pg_temp.act_as('a1');
  perform public.select_helper(pg_temp.b(n), pg_temp.u('b2'));
  perform pg_temp.act_as('b2');
  perform public.start_bounty(pg_temp.b(n), now() + interval '6 minutes');
end;
$$;

select pg_temp.anon();
select throws_ok(
  $$select public.register_live_activity_device(pg_temp.key(1), null, 'en', 'production', 'Asia/Kuala_Lumpur', 'h23')$$,
  '42501', 'not_signed_in', 'registering a device needs a session'
);

select pg_temp.act_as('a1');
select throws_ok(
  $$select public.register_live_activity_device('short', null, 'en', 'production', 'Asia/Kuala_Lumpur', 'h23')$$,
  '22023', 'invalid_device_key', 'the device key is 32 random bytes in hex'
);
select throws_ok(
  $$select public.register_live_activity_device(pg_temp.key(1), null, 'en', 'production', 'Mars/Olympus', 'h23')$$,
  '22023', 'invalid_time_zone', 'the time zone must be one Postgres knows'
);
select throws_ok(
  $$select public.register_live_activity_device(pg_temp.key(1), 'xyz', 'en', 'production', 'Asia/Kuala_Lumpur', 'h23')$$,
  '22023', 'invalid_push_token', 'a start token is hex'
);
select lives_ok(
  $$select public.register_live_activity_device(pg_temp.key(1), repeat('AB', 40), 'zh-Hans', 'sandbox', 'Asia/Kuala_Lumpur', 'h23')$$,
  'a signed-in device registers with its push-to-start token'
);
select is(
  (select start_token from public.live_activity_devices where user_id = pg_temp.u('a1')), repeat('ab', 40),
  'stored in lower case'
);
select is(
  (select key_hash from public.live_activity_devices where user_id = pg_temp.u('a1')),
  encode(sha256(convert_to(pg_temp.key(1), 'UTF8')), 'hex'),
  'only a hash of the device key is stored'
);

select ok(not has_table_privilege('authenticated', 'public.live_activity_devices', 'select'), 'devices are not readable by users');
select ok(not has_table_privilege('anon', 'public.live_activity_tokens', 'select'), 'nor are activity tokens');
select ok(has_function_privilege('anon', 'public.attach_live_activity_token(text, text, text)', 'execute'), 'the kit attaches without a session');
select ok(not has_function_privilege('authenticated', 'public.claim_live_activity_work(integer)', 'execute'), 'only notify claims work');

select pg_temp.anon();
select lives_ok(
  $$select public.attach_live_activity_token(pg_temp.key(9), repeat('cd', 40), 'tapiro://bounty/status/43000000-0000-0000-0000-000000000001')$$,
  'an unknown device key attaches nothing and says nothing'
);
select is((select count(*) from public.live_activity_tokens)::integer, 0, 'nothing was stored for it');
select throws_ok(
  $$select public.attach_live_activity_token(pg_temp.key(1), repeat('cd', 40), 'https://example.com')$$,
  '22023', 'invalid_link', 'the link must be a bounty or ride link'
);
select public.attach_live_activity_token(
  pg_temp.key(1), repeat('cd', 40), 'tapiro://bounty/status/43000000-0000-0000-0000-000000000001'
);
select public.attach_live_activity_token(
  pg_temp.key(1), repeat('ef', 40), 'tapiro://bounty/status/43000000-0000-0000-0000-000000000001'
);
select is(
  (select array_agg(token) from public.live_activity_tokens), array[repeat('ef', 40)],
  'a new token for the same activity replaces the old one'
);
select ok(
  exists (select 1 from public.live_activity_started where user_id = pg_temp.u('a1')
    and link = 'tapiro://bounty/status/43000000-0000-0000-0000-000000000001'),
  'an attached activity counts as started, so push never starts it again'
);

delete from public.live_activity_tokens;
delete from public.live_activity_started;
delete from public.live_activity_due;

select pg_temp.en_route(1);
select ok(
  exists (select 1 from public.live_activity_due where user_id = pg_temp.u('a1') and urgent),
  'the helper setting off queues urgent work for the poster, who has a device'
);
select ok(
  not exists (select 1 from public.live_activity_due where user_id = pg_temp.u('b2')),
  'nobody without a device is queued'
);

select is(pg_temp.work('a1') -> 'subjects' -> 0 ->> 'phase', 'onTheWay', 'the claim carries what the Lock Screen shows');
select is(
  pg_temp.work('a1'), null,
  'a claimed row is not claimed again while its run is live'
);
update public.live_activity_due set claimed_at = now() - interval '3 minutes';
select is(
  pg_temp.work('a1') -> 'devices' -> 0 ->> 'startToken', repeat('ab', 40),
  'a run that died is claimed again, with the device and its start token'
);

select public.finish_live_activity_work(
  pg_temp.u('a1'),
  (select version from public.live_activity_due where user_id = pg_temp.u('a1')),
  jsonb_build_object('started', jsonb_build_array(jsonb_build_object(
    'link', 'tapiro://bounty/status/' || pg_temp.b(1), 'content', '{"title":"started"}'::jsonb
  )))
);
select ok(not exists (select 1 from public.live_activity_due where user_id = pg_temp.u('a1')), 'finishing removes the work');
select ok(
  exists (select 1 from public.live_activity_started where link = 'tapiro://bounty/status/' || pg_temp.b(1)),
  'and records the push-started item'
);

select pg_temp.anon();
select public.attach_live_activity_token(pg_temp.key(1), repeat('12', 40), 'tapiro://bounty/status/' || pg_temp.b(1));
select is(
  (select last_content ->> 'title' from public.live_activity_tokens where token = repeat('12', 40)), 'started',
  'a push-started activity''s token starts from the content the push showed, so a cancel can end it with that'
);
select is(public.run_live_activity_tick(), 1, 'the tick queues an account with a running activity');
select is(
  (select urgent from public.live_activity_due where user_id = pg_temp.u('a1')), false, 'as a quiet update'
);

select pg_temp.act_as('b2');
select public.update_eta(pg_temp.b(1), now() + interval '9 minutes');
select is(
  (select version from public.live_activity_due where user_id = pg_temp.u('a1')), 2::bigint,
  'an event while work is queued bumps its version'
);
select ok((select urgent from public.live_activity_due where user_id = pg_temp.u('a1')), 'and makes it urgent');

select is(
  (select jsonb_array_length(w -> 'devices' -> 0 -> 'activities') from pg_temp.work('a1') w), 1,
  'the claim lists the device''s activity token'
);
select is(
  (select urgent from public.live_activity_due where user_id = pg_temp.u('a1')), false,
  'a claim takes the urgency with it, so later minute updates go out quietly'
);
select private.queue_live_activity_users(array[pg_temp.u('a1')], true);
select public.finish_live_activity_work(
  pg_temp.u('a1'), 2,
  jsonb_build_object(
    'contents', jsonb_build_array(jsonb_build_object('token', repeat('12', 40), 'content', '{"title":"x"}'::jsonb)),
    'dropped', jsonb_build_array(repeat('ab', 40))
  )
);
select is(
  (select last_content ->> 'title' from public.live_activity_tokens where token = repeat('12', 40)), 'x',
  'the sent content is kept for the next comparison'
);
select is(
  (select start_token from public.live_activity_devices where user_id = pg_temp.u('a1')), null,
  'a dropped start token is cleared'
);
select ok(
  exists (select 1 from public.live_activity_due where user_id = pg_temp.u('a1') and claimed_at is null),
  'work queued again during the run is left for the next claim, unclaimed'
);

select pg_temp.anon();
select public.detach_live_activity_token(pg_temp.key(2), repeat('12', 40));
select is((select count(*) from public.live_activity_tokens)::integer, 1, 'another device key detaches nothing');
select public.detach_live_activity_token(pg_temp.key(1), repeat('12', 40));
select is((select count(*) from public.live_activity_tokens)::integer, 0, 'the kit detaches a swiped-away activity');
select public.attach_live_activity_token(pg_temp.key(1), repeat('12', 40), 'tapiro://bounty/status/' || pg_temp.b(1));

select pg_temp.act_as('c3');
select public.register_live_activity_device(pg_temp.key(1), null, 'en', 'production', 'Asia/Shanghai', 'h12');
select is(
  (select count(*) from public.live_activity_tokens)::integer, 0,
  'a device signed in as another account keeps none of the previous account''s activities'
);

select pg_temp.anon();
select public.unregister_live_activity_device(pg_temp.key(1));
select is(
  (select count(*) from public.live_activity_devices)::integer, 0,
  'sign out removes the device by its key, even with an expired session'
);

select * from finish();
rollback;

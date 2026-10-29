begin;
select plan(39);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farid"}');

insert into public.payee_methods (user_id, type)
values
  ('00000000-0000-0000-0000-0000000000b2', 'cash'),
  ('00000000-0000-0000-0000-0000000000e5', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty(
  id uuid, state public.bounty_status default 'open', helper uuid default null
) returns uuid language sql as $$
  insert into public.bounties (id, poster_id, helper_id, title, category, reward_minor, reward_currency, expires_at, status, done_at)
  values (
    id, '00000000-0000-0000-0000-0000000000a1', helper, '帮取快递', 'pickup', 500, 'MYR', now() + interval '7 days', state,
    case when state in ('done', 'disputed') then now() end
  )
  returning id;
$$;

create function pg_temp.trail(item uuid, who uuid) returns bigint[] language sql as $$
  select array[
    (select count(*) from public.bounty_applications where bounty_id = item and applicant_id = who),
    (select count(*) from public.bounty_events where bounty_id = item and actor_id = who)
  ];
$$;

create temp table results (name text primary key, r jsonb);
grant all on results to authenticated;

select pg_temp.bounty('40000000-0000-0000-0000-000000000001');
select pg_temp.bounty('40000000-0000-0000-0000-000000000002');
select pg_temp.bounty('40000000-0000-0000-0000-000000000003');
select pg_temp.bounty('40000000-0000-0000-0000-000000000004');
select pg_temp.bounty('40000000-0000-0000-0000-000000000010', 'assigned', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000011', 'en_route', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000012', 'done', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000013', 'disputed', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000014', 'confirmed', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000015', 'closed');
select pg_temp.bounty('40000000-0000-0000-0000-000000000016', 'cancelled', '00000000-0000-0000-0000-0000000000f6');
select pg_temp.bounty('40000000-0000-0000-0000-000000000017');
update public.bounties set expires_at = now() - interval '1 minute' where id = '40000000-0000-0000-0000-000000000017';

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
insert into results select 'b1', public.apply_to_bounty('40000000-0000-0000-0000-000000000001', '  我可以  ');
select is(
  (select r from results where name = 'b1'), '{"status": "pending", "note": "我可以"}'::jsonb,
  'an applicant with a payee method applies with a trimmed note'
);
reset role;
select is(
  (select array_agg(row(applicant_id, status::text, note)::text) from public.bounty_applications
   where bounty_id = '40000000-0000-0000-0000-000000000001'),
  array[row('00000000-0000-0000-0000-0000000000b2'::uuid, 'pending'::text, '我可以'::text)::text],
  'one pending application is stored'
);
select is(
  (select array_agg(kind::text) from public.bounty_events
   where bounty_id = '40000000-0000-0000-0000-000000000001' and actor_id = '00000000-0000-0000-0000-0000000000b2'),
  array['applied'], 'applying writes one applied event'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_applications where bounty_id = '40000000-0000-0000-0000-000000000001'), 1::bigint,
  'the poster reads the application'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is((select count(*) from public.bounty_applications), 0::bigint, 'another user does not read it');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000001', 'hi')$$,
  '55000', 'no_payee_method', 'an applicant without a payee method is rejected'
);
reset role;
select is(
  pg_temp.trail('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4'), array[0, 0]::bigint[],
  'a rejected apply writes nothing'
);
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000d4', 'cash');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000001', 'hi') ->> 'status', 'pending',
  'after adding cash the same apply succeeds'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000001')$$,
  '22023', 'own_bounty', 'a poster cannot apply to their own bounty'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.apply_to_bounty(gen_random_uuid())$$, 'P0002', 'bounty_not_found', 'an unknown bounty is not found'
);

reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e5');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000002')$$,
  '55000', 'closed', 'a user the poster blocked sees the bounty as closed'
);
reset role;
select is(
  pg_temp.trail('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e5'), array[0, 0]::bigint[],
  'an apply blocked by the poster writes nothing'
);
delete from public.blocks;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000002')$$,
  '42501', 'blocked', 'a user who blocked the poster is told they blocked them'
);
reset role;
select is(
  pg_temp.trail('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e5'), array[0, 0]::bigint[],
  'an apply to a blocked poster writes nothing'
);
delete from public.blocks;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000002') ->> 'status', 'pending', 'after unblocking the apply succeeds'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000010')$$, '55000', 'taken', 'an assigned bounty is taken'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000011')$$, '55000', 'taken', 'an en-route bounty is taken'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000012')$$, '55000', 'taken', 'a done bounty is taken'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000013')$$, '55000', 'taken', 'a disputed bounty is taken'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000014')$$, '55000', 'taken', 'a confirmed bounty is taken'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000015')$$, '55000', 'closed', 'a closed bounty is closed'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000016')$$, '55000', 'closed', 'a cancelled bounty is closed'
);
select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000017')$$,
  '55000', 'closed', 'an open bounty past its expiry is closed before the job runs'
);

select throws_ok(
  $$select public.apply_to_bounty('40000000-0000-0000-0000-000000000003', repeat('留', 141))$$,
  '23514', null, 'a 141-character note is rejected'
);
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000003', '   '), '{"status": "pending", "note": null}'::jsonb,
  'a blank note is stored as no note'
);

reset role;
delete from public.payee_methods where user_id = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000001', '再说一次'), (select r from results where name = 'b1'),
  'replaying an apply after removing every payee method returns the pending application'
);
reset role;
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000b2', 'cash');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000001', '换一句'), (select r from results where name = 'b1'),
  'replaying an apply returns the pending application unchanged'
);
reset role;
select is(
  pg_temp.trail('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2'), array[1, 1]::bigint[],
  'a replayed apply writes nothing'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
insert into results select 'w1', public.withdraw_application('40000000-0000-0000-0000-000000000001');
select is((select r from results where name = 'w1'), '{"status": "withdrawn"}'::jsonb, 'withdrawing answers withdrawn');
reset role;
select is(
  (select row(a.status::text, (select count(*) from public.bounty_events e
     where e.bounty_id = a.bounty_id and e.actor_id = a.applicant_id and e.kind = 'withdrawn'))
   from public.bounty_applications a
   where a.bounty_id = '40000000-0000-0000-0000-000000000001' and a.applicant_id = '00000000-0000-0000-0000-0000000000b2'),
  row('withdrawn'::text, 1::bigint), 'the application is withdrawn with one withdrawn event'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.withdraw_application('40000000-0000-0000-0000-000000000001'), (select r from results where name = 'w1'),
  'withdrawing again returns the same answer'
);
reset role;
select is(
  pg_temp.trail('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2'), array[1, 2]::bigint[],
  'withdrawing again writes nothing'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.apply_to_bounty('40000000-0000-0000-0000-000000000001', '还是我'), '{"status": "pending", "note": "还是我"}'::jsonb,
  'applying after withdrawing reopens the application with the new note'
);
reset role;
select is(
  (select row(a.status::text, a.note, (select count(*) from public.bounty_events e
     where e.bounty_id = a.bounty_id and e.actor_id = a.applicant_id and e.kind = 'applied'))
   from public.bounty_applications a
   where a.bounty_id = '40000000-0000-0000-0000-000000000001' and a.applicant_id = '00000000-0000-0000-0000-0000000000b2'),
  row('pending'::text, '还是我'::text, 2::bigint), 'the reopened application is pending with a second applied event'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$select public.withdraw_application('40000000-0000-0000-0000-000000000001')$$,
  '55000', 'not_pending', 'withdrawing without an application is rejected'
);
reset role;
update public.bounty_applications set status = 'not_selected'
where bounty_id = '40000000-0000-0000-0000-000000000001' and applicant_id = '00000000-0000-0000-0000-0000000000d4';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  $$select public.withdraw_application('40000000-0000-0000-0000-000000000001')$$,
  '55000', 'not_pending', 'an application that was not selected cannot be withdrawn'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.apply_to_bounty('40000000-0000-0000-0000-000000000004');
reset role;
update public.bounties set status = 'closed' where id = '40000000-0000-0000-0000-000000000004';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select public.withdraw_application('40000000-0000-0000-0000-000000000004')$$,
  '55000', 'not_pending', 'a pending application on a closed bounty cannot be withdrawn'
);
reset role;

select is(has_function_privilege('anon', 'public.apply_to_bounty(uuid, text)', 'execute'), false, 'anon cannot apply');
select is(
  has_function_privilege('anon', 'public.withdraw_application(uuid)', 'execute'), false, 'anon cannot withdraw'
);

select * from finish();
rollback;

begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['b2', 'c3', 'd4', 'e5']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.kinds(k text) returns text[] language sql as $$
  select coalesce(array_agg(e.kind order by e.id), '{}') from public.events e
  where e.recipient = pg_temp.u(k) and e.subject_id = '46000000-0000-0000-0000-000000000001';
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('46000000-0000-0000-0000-000000000001', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u(k)), public.apply_to_bounty('46000000-0000-0000-0000-000000000001')
from unnest(array['b2', 'c3', 'd4', 'e5']) k;
select pg_temp.act_as(pg_temp.u('c3'));
select public.withdraw_application('46000000-0000-0000-0000-000000000001');
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('e5'), pg_temp.u('a1'));
delete from public.events;

select private.run_bounty_jobs(now() + interval '30 days');

select is(pg_temp.kinds('a1'), '{bounty.expired}'::text[], 'an expired bounty still reaches the poster');
select ok(
  pg_temp.kinds('b2') = '{bounty.expired}' and pg_temp.kinds('d4') = '{bounty.expired}',
  'and now reaches every pending applicant'
);
select is(pg_temp.kinds('c3'), '{}'::text[], 'an applicant who withdrew hears nothing');
select is(pg_temp.kinds('e5'), '{}'::text[], 'an applicant blocked from the poster hears nothing');
select ok(
  (select bool_and(not e.push) from public.events e where e.kind = 'bounty.expired'), 'an expiry is live only'
);
select is((select count(*) from public.push_queue q where q.kind = 'bounty.expired'), 0::bigint, 'and queues no push');
select is(
  (select m.payload - 'at' from realtime.messages m
   where m.topic = 'user:' || pg_temp.u('d4') and m.event = 'bounty.expired'),
  jsonb_build_object('kind', 'bounty.expired', 'id', '46000000-0000-0000-0000-000000000001'::uuid),
  'the applicant''s topic gets the expiry signal'
);

select * from finish();
rollback;

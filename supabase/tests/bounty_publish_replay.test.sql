begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.totals() returns bigint[] language sql as $$
  select array[
    (select count(*) from public.bounties),
    (select count(*) from public.bounty_addresses),
    (select count(*) from public.bounty_events),
    (select count(*) from public.post_charges),
    (select count(*) from public.coin_ledger)
  ];
$$;

create temp table results (name text primary key, r jsonb);
grant all on results to authenticated;
create temp table snapshots (name text primary key, v bigint[]);
grant all on snapshots to authenticated;

create function pg_temp.publish_full(reward integer, note text, at timestamptz, currency text default 'MYR')
returns jsonb language sql as $$
  select public.publish_bounty(
    '31000000-0000-0000-0000-000000000001', '帮取快递', 'pickup', reward, currency,
    description => note, place_label => 'Sunway Geo', latitude => 3.0651, longitude => 101.6047,
    address => 'Block C, 12-3', deadline_at => at
  );
$$;

insert into snapshots values ('deadline', array[extract(epoch from now() + interval '2 days')::bigint]);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into results
select 'first', pg_temp.publish_full(800, '取件码 8812', to_timestamp((select v[1] from snapshots where name = 'deadline')));
reset role;
insert into snapshots values ('after_first', pg_temp.totals());

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  pg_temp.publish_full(800, '  取件码 8812  ', to_timestamp((select v[1] from snapshots where name = 'deadline'))),
  (select r from results where name = 'first'),
  'a replay with the same content (after trimming) returns the first answer'
);
select throws_ok(
  $$select pg_temp.publish_full(1000, '取件码 8812', to_timestamp((select v[1] from snapshots where name = 'deadline')))$$,
  '55000', 'post_already_sent', 'a replay with a different reward is rejected as already sent'
);
select throws_ok(
  $$select pg_temp.publish_full(800, '取件码 8812', to_timestamp((select v[1] from snapshots where name = 'deadline')), 'CNY')$$,
  '55000', 'post_already_sent', 'a replay with a different currency is rejected as already sent'
);
select throws_ok(
  $$select pg_temp.publish_full(800, '取件码 9999', to_timestamp((select v[1] from snapshots where name = 'deadline')))$$,
  '55000', 'post_already_sent', 'a replay with a different description is rejected as already sent'
);
select throws_ok(
  $$select pg_temp.publish_full(800, '取件码 8812', to_timestamp((select v[1] from snapshots where name = 'deadline')) + interval '1 hour')$$,
  '55000', 'post_already_sent', 'a replay with a different deadline is rejected as already sent'
);
select throws_ok(
  $$select public.publish_bounty('31000000-0000-0000-0000-000000000001', '帮买奶茶', 'pickup', 800, 'MYR',
      description => '取件码 8812', place_label => 'Sunway Geo', latitude => 3.0651, longitude => 101.6047,
      address => 'Block C, 12-3', deadline_at => to_timestamp((select v[1] from snapshots where name = 'deadline')))$$,
  '55000', 'post_already_sent', 'a replay with a different title is rejected as already sent'
);
select throws_ok(
  $$select public.publish_bounty('31000000-0000-0000-0000-000000000001', '帮取快递', 'pickup', 800, 'MYR',
      description => '取件码 8812', place_label => 'Sunway Geo', latitude => 3.0651, longitude => 101.6047,
      deadline_at => to_timestamp((select v[1] from snapshots where name = 'deadline')))$$,
  '55000', 'post_already_sent', 'a replay without the exact address is rejected as already sent'
);
reset role;

select is(pg_temp.totals(), (select v from snapshots where name = 'after_first'), 'rejected replays write nothing');
select is(
  (select reward_minor from public.bounties where id = '31000000-0000-0000-0000-000000000001'), 800::bigint,
  'the stored bounty keeps the first content'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$select pg_temp.publish_full(800, '取件码 8812', to_timestamp((select v[1] from snapshots where name = 'deadline')))$$,
  '22023', 'invalid_bounty', 'another user replaying the id is still invalid, not already sent'
);
reset role;

select * from finish();
rollback;

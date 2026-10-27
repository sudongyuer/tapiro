begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

select public.block_user('00000000-0000-0000-0000-0000000000a1');
select is(
  (select row(blocker_id, blocked_id) from public.blocks),
  row('00000000-0000-0000-0000-0000000000b2'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid),
  'the blocker reads their block'
);
select is(
  private.is_blocked_between('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2'), true,
  'a block counts from the blocked side'
);
select is(
  private.is_blocked_between('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1'), true,
  'a block counts from the blocker side'
);
select is(
  private.is_blocked_between('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3'), false,
  'an unrelated pair is not blocked'
);
select is(
  private.is_blocked_between(null, '00000000-0000-0000-0000-0000000000b2'), false, 'a null first user is not blocked'
);
select is(
  private.is_blocked_between('00000000-0000-0000-0000-0000000000b2', null), false, 'a null second user is not blocked'
);

select public.block_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from public.blocks), 1::bigint, 'blocking twice leaves one row');

select throws_ok(
  $$select public.block_user('00000000-0000-0000-0000-0000000000b2')$$,
  '22023', 'cannot_block_self', 'blocking yourself is rejected'
);
select throws_ok(
  $$select public.block_user('00000000-0000-0000-0000-00000000dead')$$,
  'P0002', 'user_not_found', 'blocking an unknown user is rejected'
);
select throws_ok(
  $$insert into public.blocks (blocker_id, blocked_id)
    values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c3')$$,
  '42501', null, 'a client cannot insert a block'
);
select throws_ok(
  $$update public.blocks set created_at = now()$$,
  '42501', null, 'a client cannot change a block'
);
select throws_ok(
  $$delete from public.blocks$$,
  '42501', null, 'a client cannot delete a block'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from public.blocks), 0::bigint, 'the blocked user cannot see the block');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.unblock_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from public.blocks), 0::bigint, 'unblocking removes the row');
select is(
  private.is_blocked_between('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2'), false,
  'after unblocking the pair is no longer blocked'
);
select lives_ok(
  $$select public.unblock_user('00000000-0000-0000-0000-0000000000a1')$$, 'unblocking again is not an error'
);

reset role;
select is(
  has_function_privilege('anon', 'public.block_user(uuid)', 'execute'), false, 'anon cannot block'
);

set local role authenticated;
select public.block_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.block_user('00000000-0000-0000-0000-0000000000b2');
reset role;
select is((select count(*) from public.blocks), 2::bigint, 'both sides have blocked each other');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000b2';
select is((select count(*) from public.blocks), 0::bigint, 'deleting an account removes its blocks in both directions');

select * from finish();
rollback;

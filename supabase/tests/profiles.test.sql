begin;
select plan(23);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', ('{"full_name":"' || repeat('x', 60) || '"}')::jsonb),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"   "}');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Alice Tan', 'trigger prefills from full_name');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'Bob Lim', 'trigger falls back to name');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000c3'), 'Tapiro', 'trigger uses placeholder without metadata');
select is((select char_length(display_name) from public.profiles where id = '00000000-0000-0000-0000-0000000000d4'), 40, 'trigger truncates long names to 40');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e5'), 'Tapiro', 'trigger uses placeholder for blank names');

select throws_ok(
  $$update public.profiles set display_name = '' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, 'empty display_name violates check'
);
select throws_ok(
  $$update public.profiles set display_name = repeat('y', 41) where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, '41-char display_name violates check'
);

select throws_ok(
  $$update public.profiles set display_name = '   ' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, 'whitespace-only display_name violates check'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*) from public.profiles where id in (
  '00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000c3',
  '00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000e5')), 5::bigint, 'signed-in user reads every profile');

select lives_ok(
  $$update public.profiles set display_name = 'Alice 2', avatar_url = 'https://example.com/a.png' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'owner updates own profile'
);
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Alice 2', 'owner update persisted');
select ok((select updated_at > created_at from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'updated_at is bumped on update');

select lives_ok(
  $$update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-0000000000b2'$$,
  'updating another user is filtered by RLS without error'
);

select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000f7' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'authenticated cannot update id'
);
select throws_ok(
  $$update public.profiles set created_at = now() where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'authenticated cannot update created_at'
);
select throws_ok(
  $$update public.profiles set updated_at = now() where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'authenticated cannot update updated_at'
);

select throws_ok(
  $$insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-0000000000f6', 'Mallory')$$,
  '42501', null, 'inserting a row for another id is denied'
);

select throws_ok(
  $$delete from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'owner cannot delete own row'
);

reset role;
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'Bob Lim', 'other user row is unchanged');

set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');
select throws_ok(
  $$insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-0000000000f8', 'Anon')$$,
  '42501', null, 'anon cannot insert'
);

reset role;
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'deleting auth user succeeds'
);
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'profile cascades with auth user');

select * from finish();
rollback;

begin;
select plan(67);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty(
  id uuid, poster uuid, state public.bounty_status default 'open', helper uuid default null
) returns uuid language sql as $$
  insert into public.bounties (id, poster_id, helper_id, title, category, reward_sen, expires_at, status)
  values (id, poster, helper, '帮取快递', 'pickup', 500, now() + interval '7 days', state)
  returning id;
$$;

select is(
  (select extnamespace::regnamespace::text from pg_extension where extname = 'postgis'), 'extensions',
  'postgis is installed in the extensions schema'
);
select ok(
  extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(101.6067, 3.0733), 4326)::extensions.geography,
    extensions.st_setsrid(extensions.st_makepoint(101.6038, 3.0670), 4326)::extensions.geography
  ) between 500 and 1000,
  'Sunway Pyramid to Sunway University is several hundred metres'
);

select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), 't', 'pickup', 99, now() + interval '1 day')$$,
  '23514', null, 'a reward under RM 1 is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), 't', 'pickup', 50001, now() + interval '1 day')$$,
  '23514', null, 'a reward over RM 500 is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), 't', 'pickup', 150, now() + interval '1 day')$$,
  '23514', null, 'a reward that is not whole ringgit is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), repeat('题', 61), 'pickup', 500, now() + interval '1 day')$$,
  '23514', null, 'a 61-character title is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, place, place_label)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day',
      extensions.st_setsrid(extensions.st_makepoint(101.6067, 3.0733), 4326)::extensions.geography, repeat('地', 81))$$,
  '23514', null, 'an 81-character place label is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, description)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', repeat('述', 501))$$,
  '23514', null, 'a 501-character description is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), 't', 'parcel', 500, now() + interval '1 day')$$,
  '23514', null, 'a category outside the eight is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, place)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day',
      extensions.st_setsrid(extensions.st_makepoint(101.6067, 3.0733), 4326)::extensions.geography)$$,
  '23514', null, 'a place without a label is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, starts_at, ends_at)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day',
      now() + interval '2 hours', now() + interval '1 hour')$$,
  '23514', null, 'an end before the start is rejected'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, payment_timing)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', 'before')$$,
  '23514', null, 'paying before is not offered yet'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, gate)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', 'reliable')$$,
  '23514', null, 'a reputation gate is not offered yet'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, helper_id)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', '00000000-0000-0000-0000-0000000000b2')$$,
  '23514', null, 'an open bounty has no helper'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, status)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', 'assigned')$$,
  '23514', null, 'an assigned bounty has a helper'
);
select throws_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, status, helper_id)
    values (gen_random_uuid(), 't', 'pickup', 500, now() + interval '1 day', 'done', '00000000-0000-0000-0000-0000000000b2')$$,
  '23514', null, 'a done bounty records when it was done'
);

select lives_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at, description, place, place_label)
    values ('10000000-0000-0000-0000-000000000001', repeat('题', 60), 'pickup', 100, now() + interval '1 day',
      repeat('述', 500), extensions.st_setsrid(extensions.st_makepoint(101.6067, 3.0733), 4326)::extensions.geography,
      repeat('地', 80))$$,
  'RM 1, a 60-character title, an 80-character label and a 500-character description are accepted'
);
select lives_ok(
  $$insert into public.bounties (id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), 't', 'other', 50000, now() + interval '1 day')$$,
  'RM 500 is accepted'
);
select throws_ok(
  $$insert into public.bounty_applications (bounty_id, applicant_id, note)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', repeat('留', 141))$$,
  '23514', null, 'a 141-character note is rejected'
);
select lives_ok(
  $$insert into public.bounty_applications (bounty_id, applicant_id, note)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', repeat('留', 140))$$,
  'a 140-character note is accepted'
);
select throws_ok(
  $$insert into public.bounty_addresses (bounty_id, address)
    values ('10000000-0000-0000-0000-000000000001', repeat('址', 121))$$,
  '23514', null, 'a 121-character address is rejected'
);
select lives_ok(
  $$insert into public.bounty_addresses (bounty_id, address)
    values ('10000000-0000-0000-0000-000000000001', repeat('址', 120))$$,
  'a 120-character address is accepted'
);

select pg_temp.bounty('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.bounty(
  '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'assigned',
  '00000000-0000-0000-0000-0000000000b2'
);
insert into public.bounty_applications (bounty_id, applicant_id, status)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', 'pending'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'selected'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d4', 'not_selected');
select throws_ok(
  $$update public.bounty_applications set status = 'selected'
    where bounty_id = '20000000-0000-0000-0000-000000000002' and applicant_id = '00000000-0000-0000-0000-0000000000d4'$$,
  '23505', null, 'a bounty has at most one selected application'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000001'), 1::bigint,
  'an open bounty is read by anyone signed in'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_applications where applicant_id = '00000000-0000-0000-0000-0000000000c3'), 1::bigint,
  'the poster reads an application to their bounty'
);
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c3');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is(
  (select count(*) from public.bounties where poster_id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint,
  'after the poster blocks them, a user reads none of their bounties'
);
select is(
  (select count(*) from public.bounty_applications), 1::bigint, 'the blocked applicant still reads their own application'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_applications where applicant_id = '00000000-0000-0000-0000-0000000000c3'), 0::bigint,
  'after a block the poster no longer reads that application'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000001'), 1::bigint,
  'a block between two others leaves the bounty readable'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000002'), 1::bigint,
  'the poster reads an assigned bounty'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000002'), 1::bigint,
  'the helper reads an assigned bounty'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000002'), 0::bigint,
  'an unrelated user does not read an assigned bounty'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select is(
  (select count(*) from public.bounties where id = '20000000-0000-0000-0000-000000000002'), 1::bigint,
  'an applicant who was not selected still reads the bounty'
);
select is(
  (select array_agg(applicant_id) from public.bounty_applications),
  array['00000000-0000-0000-0000-0000000000d4'::uuid], 'an applicant reads only their own application'
);

reset role;
select pg_temp.bounty('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1');
insert into public.bounty_addresses (bounty_id, address) values ('20000000-0000-0000-0000-000000000003', 'Block C, 12-3');
insert into public.bounty_applications (bounty_id, applicant_id)
values ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b2');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select address from public.bounty_addresses where bounty_id = '20000000-0000-0000-0000-000000000003'), 'Block C, 12-3',
  'the poster reads the address'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*) from public.bounty_addresses), 0::bigint, 'an applicant does not read the address while open');
reset role;
update public.bounties set status = 'assigned', helper_id = '00000000-0000-0000-0000-0000000000b2'
where id = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select address from public.bounty_addresses where bounty_id = '20000000-0000-0000-0000-000000000003'), 'Block C, 12-3',
  'the selected helper reads the address'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is((select count(*) from public.bounty_addresses), 0::bigint, 'an unrelated user never reads the address');
reset role;
update public.bounties set status = 'cancelled' where id = '20000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*) from public.bounty_addresses), 0::bigint, 'after a cancel the helper no longer reads the address');

reset role;
insert into public.bounty_events (bounty_id, kind, actor_id, to_status)
values
  ('20000000-0000-0000-0000-000000000002', 'published', '00000000-0000-0000-0000-0000000000a1', 'open'),
  ('20000000-0000-0000-0000-000000000002', 'selected', '00000000-0000-0000-0000-0000000000a1', 'assigned');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_events where bounty_id = '20000000-0000-0000-0000-000000000002'), 2::bigint,
  'the poster reads the events'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select count(*) from public.bounty_events where bounty_id = '20000000-0000-0000-0000-000000000002'), 2::bigint,
  'the helper reads the events'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select is((select count(*) from public.bounty_events), 0::bigint, 'an applicant does not read the events');

reset role;
insert into public.bounty_events (bounty_id, kind, actor_id)
values
  ('20000000-0000-0000-0000-000000000002', 'applied', '00000000-0000-0000-0000-0000000000b2'),
  ('20000000-0000-0000-0000-000000000002', 'applied', '00000000-0000-0000-0000-0000000000d4'),
  ('20000000-0000-0000-0000-000000000002', 'withdrawn', '00000000-0000-0000-0000-0000000000d4');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  (select array_agg(kind::text || ' ' || (actor_id = '00000000-0000-0000-0000-0000000000b2')::text order by id)
   from public.bounty_events
   where bounty_id = '20000000-0000-0000-0000-000000000002' and kind in ('applied', 'withdrawn')),
  array['applied true'], 'the helper reads their own applied event and no other applicant''s'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_events
   where bounty_id = '20000000-0000-0000-0000-000000000002' and kind in ('applied', 'withdrawn')),
  3::bigint, 'the poster reads every applicant''s events'
);
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*) from public.bounty_events where actor_id = '00000000-0000-0000-0000-0000000000d4'), 0::bigint,
  'after an applicant blocks the poster the poster reads none of their events'
);
select is(
  (select array_agg(kind::text order by id) from public.bounty_events
   where bounty_id = '20000000-0000-0000-0000-000000000002'),
  array['published', 'selected', 'applied'], 'and still reads the other events of the bounty'
);
reset role;
delete from public.blocks where blocker_id = '00000000-0000-0000-0000-0000000000d4';
set local role authenticated;

reset role;
insert into public.bounty_seen (user_id, bounty_id, card)
values
  ('00000000-0000-0000-0000-0000000000d4', '20000000-0000-0000-0000-000000000002', 'not_selected'),
  ('00000000-0000-0000-0000-0000000000e5', '20000000-0000-0000-0000-000000000002', 'expired');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select is(
  (select array_agg(user_id) from public.bounty_seen), array['00000000-0000-0000-0000-0000000000d4'::uuid],
  'a user reads only their own seen flags'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$insert into public.bounties (id, poster_id, title, category, reward_sen, expires_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 't', 'pickup', 500, now() + interval '1 day')$$,
  '42501', null, 'a client cannot insert a bounty'
);
select throws_ok($$update public.bounties set status = 'closed'$$, '42501', null, 'a client cannot update a bounty');
select throws_ok($$delete from public.bounties$$, '42501', null, 'a client cannot delete a bounty');
select throws_ok(
  $$insert into public.bounty_addresses (bounty_id, address) values ('20000000-0000-0000-0000-000000000001', 'x')$$,
  '42501', null, 'a client cannot insert an address'
);
select throws_ok($$update public.bounty_addresses set address = 'x'$$, '42501', null, 'a client cannot update an address');
select throws_ok($$delete from public.bounty_addresses$$, '42501', null, 'a client cannot delete an address');
select throws_ok(
  $$insert into public.bounty_applications (bounty_id, applicant_id)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'a client cannot insert an application'
);
select throws_ok(
  $$update public.bounty_applications set status = 'selected'$$, '42501', null, 'a client cannot update an application'
);
select throws_ok($$delete from public.bounty_applications$$, '42501', null, 'a client cannot delete an application');
select throws_ok(
  $$insert into public.bounty_events (bounty_id, kind) values ('20000000-0000-0000-0000-000000000001', 'published')$$,
  '42501', null, 'a client cannot insert an event'
);
select throws_ok($$update public.bounty_events set reason = 'x'$$, '42501', null, 'a client cannot update an event');
select throws_ok($$delete from public.bounty_events$$, '42501', null, 'a client cannot delete an event');
select throws_ok(
  $$insert into public.bounty_seen (user_id, bounty_id, card)
    values ('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'expired')$$,
  '42501', null, 'a client cannot insert a seen flag'
);
select throws_ok($$update public.bounty_seen set seen_at = now()$$, '42501', null, 'a client cannot update a seen flag');
select throws_ok($$delete from public.bounty_seen$$, '42501', null, 'a client cannot delete a seen flag');

reset role;
set local role anon;
select throws_ok($$select count(*) from public.bounties$$, '42501', null, 'anon cannot read bounties');
select throws_ok($$select count(*) from public.bounty_addresses$$, '42501', null, 'anon cannot read addresses');
select throws_ok($$select count(*) from public.bounty_applications$$, '42501', null, 'anon cannot read applications');
select throws_ok($$select count(*) from public.bounty_events$$, '42501', null, 'anon cannot read events');
select throws_ok($$select count(*) from public.bounty_seen$$, '42501', null, 'anon cannot read seen flags');
reset role;

select * from finish();
rollback;

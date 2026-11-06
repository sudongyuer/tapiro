begin;
select plan(38);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.stickers(k text, n integer) returns void language sql as $$
  insert into public.stickers (owner_id, item_kind, item_id, role, title)
  select pg_temp.u(k), 'ride', gen_random_uuid(), 'payer', 'x' from generate_series(1, n);
$$;

select is(
  (select array_agg(public.mascot_level(n) order by n) from unnest(array[0, 2, 3, 7, 8, 14, 15, 24, 25, 39, 40, 54, 55]) n),
  array[1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7], 'levels at 3, 8, 15 and 25 stickers, then every 15'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.my_mascot(),
  '{"level": 1, "stickers": 0, "accessory": null, "seenLevel": 1, "levelUp": false, "nextLevelAt": 3,
    "chosenAccessory": null, "unlocked": []}'::jsonb,
  'a new user is 貘宝宝 with nothing unlocked'
);

reset role;
select pg_temp.stickers('a1', 3);
set local role authenticated;
select is(
  (select row(m ->> 'level', m ->> 'levelUp', m ->> 'accessory', m ->> 'nextLevelAt') from public.my_mascot() m),
  row('2'::text, 'true'::text, 'red_hat'::text, '8'::text),
  'the third sticker grows 小貘 to Lv.2 wearing the red hat, with the moment unseen'
);
select is(public.mark_level_seen(9) ->> 'seenLevel', '2', 'the seen level cannot pass the current level');
select is(public.my_mascot() ->> 'levelUp', 'false', 'the moment plays once');
select is(public.mark_level_seen(1) ->> 'seenLevel', '2', 'the seen level never goes back');
select throws_ok($$select public.set_mascot_accessory('backpack')$$, '55000', 'accessory_locked',
  'a locked accessory cannot be worn');

reset role;
select pg_temp.stickers('a1', 5);
set local role authenticated;
select is(
  (select row(m ->> 'level', m ->> 'accessory', m -> 'unlocked') from public.my_mascot() m),
  row('3'::text, 'backpack'::text, '["red_hat", "backpack"]'::jsonb),
  'the newest accessory is worn by default'
);
select is(public.set_mascot_accessory('red_hat') ->> 'accessory', 'red_hat', 'an unlocked older accessory can be chosen');
select is(public.my_mascot() ->> 'accessory', 'red_hat', 'the choice is kept');
select is(public.set_mascot_accessory(null) ->> 'accessory', 'backpack', 'clearing the choice wears the newest again');
select throws_ok($$select * from public.mascot_progress$$, '42501', null, 'clients cannot read mascot progress directly');

reset role;
select is(
  (select seen_level from public.mascot_progress where user_id = pg_temp.u('a1')), 2,
  'progress is stored per user'
);

insert into public.payee_methods (user_id, type) values (pg_temp.u('b2'), 'cash');
create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids select 'p' || n, public.open_payment(
  'bounty', gen_random_uuid(), '帮取快递 ' || n, pg_temp.u(case when n = 5 then 'd4' else 'a1' end), pg_temp.u('b2'),
  1200, 'MYR', item_category => 'pickup'
) from generate_series(1, 5) n;
set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received(id) from ids order by name;

reset role;
insert into public.reviews (item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, chips, negative, closes_at, revealed_at)
select 'bounty', p.item_id, p.payer_id, pg_temp.u('b2'), 'helper', f.face::public.review_face, f.chips, f.negative,
  now() + interval '5 days', case when f.shown then now() - (f.age || ' hours')::interval end
from (
  values
    (1, 'happy', array['on_time'], false, true, 5),
    (2, 'happy', '{}'::text[], false, true, 4),
    (3, 'unhappy', array['late'], true, true, 3),
    (4, 'okay', '{}'::text[], false, true, 2),
    (5, 'happy', array['careful'], false, false, 1)
) as f (n, face, chips, negative, shown, age)
join public.payments p on p.title = '帮取快递 ' || f.n;
insert into public.review_replies (review_id, author_id, body)
select id, pg_temp.u('b2'), '那天电梯坏了' from public.reviews where face = 'unhappy';
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('c3'), pg_temp.u('b2'));

set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select row(c ->> 'name', c ->> 'self', c ->> 'blockedByMe', c ->> 'tier') from public.profile_card(pg_temp.u('b2')) c),
  row('Bob Lim'::text, 'false'::text, 'true'::text, 'new_friend'::text),
  'another user reads the name, the tier and whether they blocked them'
);
select is(
  (select row(c ->> 'helped', c ->> 'settled', c ->> 'reviewCount', c -> 'faces') from public.profile_card(pg_temp.u('b2')) c),
  row('2'::text, '5'::text, '4'::text, '{"happy": 2, "okay": 1, "unhappy": 1}'::jsonb),
  'the numbers count distinct people helped, settled items and only visible reviews'
);
select is(
  public.profile_card(pg_temp.u('b2')) -> 'completionRate', 'null'::jsonb,
  'the completion rate waits for a snapshot even after 5 settled items'
);

reset role;
select public.recompute_reputation();
set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(public.profile_card(pg_temp.u('b2')) ->> 'completionRate', '1.0000', 'from 5 settled items the rate is shown');
select is(public.profile_card(pg_temp.u('a1')) -> 'completionRate', 'null'::jsonb, 'under 5 settled items it is not');
select is(
  (select jsonb_agg(x ->> 'face') from jsonb_array_elements(public.profile_card(pg_temp.u('b2')) -> 'latestReviews') x),
  '["okay", "unhappy", "happy"]'::jsonb, 'the latest 3 visible reviews come newest first'
);
select is(
  (select row(x ->> 'title', x -> 'reviewer' ->> 'name', x -> 'reply' ->> 'body', x ->> 'kind')
   from jsonb_array_elements(public.profile_card(pg_temp.u('b2')) -> 'latestReviews') x where x ->> 'face' = 'unhappy'),
  row('帮取快递 3'::text, 'Alice Tan'::text, '那天电梯坏了'::text, 'bounty'::text),
  'a public review carries the bounty title, the reviewer and the reply'
);
select is(
  (select row(m ->> 'level', m ->> 'stickers', m ? 'seenLevel') from (select public.profile_card(pg_temp.u('a1')) -> 'mascot' m) s),
  row('3'::text, '12'::text, false),
  'the profile shows the level and sticker count but not private mascot state'
);
select is(public.profile_card(pg_temp.u('c3')) ->> 'self', 'true', 'your own profile says so');
select throws_ok($$select public.profile_card(gen_random_uuid())$$, 'P0002', 'user_not_found', 'an unknown person is not found');

select is(
  (select jsonb_agg(x ->> 'face') from jsonb_array_elements(public.profile_reviews(pg_temp.u('b2'), null, 3) -> 'items') x),
  '["okay", "unhappy", "happy"]'::jsonb, 'all reviews page newest first'
);
select is(public.profile_reviews(pg_temp.u('b2'), null, 3) ->> 'hasMore', 'true', 'a full page says there is more');
select is(
  (select jsonb_agg(x ->> 'face') from jsonb_array_elements(
    public.profile_reviews(pg_temp.u('b2'), public.profile_reviews(pg_temp.u('b2'), null, 3) ->> 'nextCursor', 3) -> 'items') x),
  '["happy"]'::jsonb, 'the cursor continues after the last row'
);
select is(
  (select row(p ->> 'hasMore', p -> 'nextCursor') from public.profile_reviews(pg_temp.u('b2'), null, 4) p),
  row('false'::text, 'null'::jsonb), 'the last page has no cursor'
);
select is(jsonb_array_length(public.profile_reviews(pg_temp.u('c3')) -> 'items'), 0, 'no reviews is an empty page');
select throws_ok($$select public.profile_reviews(pg_temp.u('b2'), 'garbage')$$, '22023', 'invalid_cursor',
  'a malformed cursor is refused');

reset role;
insert into public.rides (
  id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short, depart_at, currency,
  split_mode, status, settled_at
)
values (
  '10000000-0000-0000-0000-0000000000f1', pg_temp.u('d4'), 'SRID=4326;POINT(101.6078 3.0733)', 'Home', '我家',
  'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', now() - interval '3 hours', 'MYR', 'grab', 'closed', now()
);
insert into public.reviews (item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, negative, closes_at, revealed_at)
values ('ride', '10000000-0000-0000-0000-0000000000f1', pg_temp.u('d4'), pg_temp.u('c3'), 'rider', 'happy', false,
  now(), now());
set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select row(x ->> 'kind', x -> 'title') from jsonb_array_elements(public.profile_card(pg_temp.u('c3')) -> 'latestReviews') x),
  row('ride'::text, 'null'::jsonb), 'a ride review never shows the route on a public profile'
);
select is(
  (select x -> 'reviewer' from jsonb_array_elements(public.profile_card(pg_temp.u('c3')) -> 'latestReviews') x),
  'null'::jsonb, 'nor who rode with whom'
);
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select x -> 'reviewer' ->> 'name' from jsonb_array_elements(public.profile_card(pg_temp.u('c3')) -> 'latestReviews') x),
  'Devi', 'the reviewee still sees who wrote it'
);
select pg_temp.act_as(pg_temp.u('b2'));

select is(has_function_privilege('anon', 'public.profile_card(uuid)', 'execute'), false, 'anon cannot read profiles');
select is(has_function_privilege('authenticated', 'private.mascot_json(uuid, boolean)', 'execute'), false,
  'the private helpers stay private');
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.mark_level_seen(2)$$, '42501', 'not_signed_in', 'a signed-out call is refused');

reset role;
delete from auth.users where id = pg_temp.u('a1');
select is((select count(*) from public.mascot_progress where user_id = pg_temp.u('a1')), 0::bigint,
  'deleting the account removes mascot progress');

select pg_temp.stickers('c3', 30);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select row(m ->> 'level', m ->> 'accessory', m ->> 'nextLevelAt') from public.my_mascot() m),
  row('5'::text, 'scarf'::text, '40'::text), 'from Lv.5 the scarf is the newest accessory and Lv.6 comes at 40'
);
select is(
  public.my_mascot() ->> 'levelUp', 'true', 'a user without a stored seen level gets the moment once'
);

select * from finish();
rollback;

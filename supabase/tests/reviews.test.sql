begin;
select plan(50);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Eve"}');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

insert into public.payee_methods (user_id, type) values (pg_temp.u('b2'), 'cash');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values ('bounty', gen_random_uuid()), ('ride', '10000000-0000-0000-0000-0000000000f1');
insert into ids
select 'payment', public.open_payment(
  'bounty', (select id from ids where name = 'bounty'), '帮取快递', pg_temp.u('a1'), pg_temp.u('b2'), 1200, 'MYR',
  item_category => 'pickup'
);

insert into public.rides (
  id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short, depart_at, currency,
  split_mode, status, settled_at
)
values (
  (select id from ids where name = 'ride'), pg_temp.u('c3'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
  'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', now() - interval '3 hours', 'MYR', 'grab', 'closed', now()
);
insert into public.ride_members (ride_id, member_id, status)
select (select id from ids where name = 'ride'), pg_temp.u(k), 'boarded' from unnest(array['c3', 'd4', 'e5']) k;
insert into public.stickers (owner_id, item_kind, item_id, role, title)
select pg_temp.u(k), 'ride', (select id from ids where name = 'ride'),
  case when k = 'c3' then 'payee' else 'payer' end::public.sticker_role, '双威 → KLIA2'
from unnest(array['c3', 'd4', 'e5']) k;

create function pg_temp.state(kind text, item text, counterpart text) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.review_state(kind::public.payment_item_kind, (select id from ids where name = item))) x
  where x -> 'counterpart' ->> 'id' = pg_temp.u(counterpart)::text;
$$;

create function pg_temp.submit(item text, reviewee text, face text, chips text[], sentence text default null)
returns jsonb language sql as $$
  select public.submit_review(
    case when item = 'ride' then 'ride' else 'bounty' end::public.payment_item_kind,
    (select id from ids where name = item), pg_temp.u(reviewee), face::public.review_face, chips, sentence
  );
$$;

set local role authenticated;

select pg_temp.act_as(pg_temp.u('a1'));
select is(jsonb_array_length(public.pending_reviews()), 0, 'nothing to review before the bounty settles');

select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received((select id from ids where name = 'payment'));

select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select row(x -> 'counterpart' ->> 'name', x ->> 'role', x ->> 'title', x ->> 'theyReviewed')
   from jsonb_array_elements(public.pending_reviews()) x),
  row('Bob Lim'::text, 'helper'::text, '帮取快递'::text, 'false'::text),
  'the poster is asked to review the helper once the payment settles'
);
select is(
  (pg_temp.state('bounty', 'bounty', 'b2') ->> 'state'), 'open', 'the poster''s row is open before reviewing'
);
select ok(
  (pg_temp.state('bounty', 'bounty', 'b2') ->> 'closesAt')::timestamptz between now() + interval '6 days 23 hours'
    and now() + interval '7 days 1 minute',
  'the window closes 7 days after the settle'
);

select throws_ok($$select pg_temp.submit('bounty', 'b2', 'happy', array['late'])$$,
  '22023', 'invalid_review', 'a happy face takes only good chips');
select throws_ok($$select pg_temp.submit('bounty', 'b2', 'okay', array['on_time'])$$,
  '22023', 'invalid_review', 'a so-so face takes only not-good chips');
select throws_ok($$select pg_temp.submit('bounty', 'b2', 'happy', array['fair_split'])$$,
  '22023', 'invalid_review', 'a chip from another role''s set is refused');
select throws_ok($$select pg_temp.submit('bounty', 'b2', 'happy', array['careful', 'careful'])$$,
  '22023', 'invalid_review', 'a chip cannot be picked twice');
select throws_ok($$select pg_temp.submit('bounty', 'b2', 'happy', array['on_time'], repeat('好', 201))$$,
  '22023', 'invalid_review', 'the sentence is at most 200 characters');
select throws_ok($$select pg_temp.submit('bounty', 'c3', 'happy', '{}')$$,
  'P0002', 'review_not_found', 'nobody outside the pair can be reviewed');

select is(
  (select row(r ->> 'state', r -> 'mine' ->> 'sentence', r -> 'mine' ->> 'editable', r -> 'mine' -> 'chips')
   from pg_temp.submit('bounty', 'b2', 'happy', array['on_time', 'careful'], E'  谢谢​ ') r),
  row('sealed'::text, '谢谢'::text, 'true'::text, '["on_time", "careful"]'::jsonb),
  'a submitted review is sealed, editable and its sentence is trimmed'
);
select is(jsonb_array_length(public.pending_reviews()), 0, 'a submitted review leaves the pending list');

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select row(r ->> 'state', r ->> 'theyReviewed', r -> 'theirs') from pg_temp.state('bounty', 'bounty', 'a1') r),
  row('open'::text, 'true'::text, 'null'::jsonb),
  'the other side learns they were reviewed but not what was said'
);
select is(
  (select x ->> 'theyReviewed' from jsonb_array_elements(public.pending_reviews()) x), 'true',
  'the pending list says the other side already reviewed'
);
select throws_ok($$select count(*) from public.reviews$$, '42501', null, 'clients cannot read the reviews table');
select is((public.profile_card(pg_temp.u('b2')) ->> 'reviewCount')::integer, 0, 'a sealed review is not on the profile');

select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select row(r ->> 'state', r -> 'mine' ->> 'face', r -> 'mine' -> 'chips')
   from pg_temp.submit('bounty', 'b2', 'unhappy', array['late']) r),
  row('sealed'::text, 'unhappy'::text, '["late"]'::jsonb),
  'a sealed review can be changed'
);

reset role;
select is(
  (select row(face::text, negative, sentence) from public.reviews where reviewer_id = pg_temp.u('a1')),
  row('unhappy'::text, true, null::text),
  'the change replaces the face, the chips and the sentence and marks the negative chip'
);
set local role authenticated;

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select row(r ->> 'state', r -> 'theirs' ->> 'face', r -> 'mine' ->> 'editable')
   from pg_temp.submit('bounty', 'a1', 'happy', array['paid_promptly', 'polite']) r),
  row('revealed'::text, 'unhappy'::text, 'false'::text),
  'the second submit reveals both reviews at once'
);

select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select row(r ->> 'state', r -> 'theirs' ->> 'face') from pg_temp.state('bounty', 'bounty', 'b2') r),
  row('revealed'::text, 'happy'::text),
  'the first reviewer sees both after the reveal'
);
select throws_ok($$select pg_temp.submit('bounty', 'b2', 'happy', '{}')$$,
  '55000', 'review_locked', 'a revealed review cannot be changed');

reset role;
select is(
  (select count(*) from public.reviews where revealed_at is not null and item_id = (select id from ids where name = 'bounty')),
  2::bigint, 'both bounty reviews carry the reveal time'
);
create temp table review_ids as
select reviewer_id, id from public.reviews where item_id = (select id from ids where name = 'bounty');
grant select on review_ids to authenticated;
set local role authenticated;

select pg_temp.act_as(pg_temp.u('b2'));
select throws_ok(
  $$select public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('b2')), '谢谢')$$,
  'P0002', 'review_not_found', 'the author cannot reply to their own review'
);
select throws_ok(
  $$select public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('a1')), E'  ')$$,
  '22023', 'invalid_reply', 'an empty reply is refused'
);
select throws_ok(
  $$select public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('a1')), repeat('字', 201))$$,
  '22023', 'invalid_reply', 'a reply is at most 200 characters'
);
select is(
  public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('a1')), ' 那天电梯坏了 ') ->> 'body',
  '那天电梯坏了', 'the reviewee replies once'
);
select is(
  public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('a1')), '那天电梯坏了') ->> 'body',
  '那天电梯坏了', 'repeating the same reply answers with the stored one'
);
select throws_ok(
  $$select public.reply_to_review((select id from review_ids where reviewer_id = pg_temp.u('a1')), '改一下')$$,
  '55000', 'already_replied', 'a reply cannot be changed'
);
select is(
  pg_temp.state('bounty', 'bounty', 'a1') -> 'theirs' -> 'reply' ->> 'body', '那天电梯坏了',
  'the reply shows under the review'
);

select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select array_agg(x -> 'counterpart' ->> 'name' order by x -> 'counterpart' ->> 'name')
   from jsonb_array_elements(public.review_state('ride', (select id from ids where name = 'ride'))) x),
  array['Devi', 'Eve'], 'the organiser reviews each rider'
);
select is(
  (select array_agg(distinct x ->> 'role') from jsonb_array_elements(public.review_state('ride', (select id from ids where name = 'ride'))) x),
  array['rider'], 'riders are reviewed with the rider chips'
);
select throws_ok($$select pg_temp.submit('ride', 'd4', 'happy', array['fair_split'])$$,
  '22023', 'invalid_review', 'the organiser picks from the rider set');

select pg_temp.act_as(pg_temp.u('d4'));
select is(
  (select array_agg(x ->> 'role') from jsonb_array_elements(public.review_state('ride', (select id from ids where name = 'ride'))) x),
  array['organiser'], 'a rider reviews only the organiser'
);
select throws_ok($$select pg_temp.submit('ride', 'e5', 'happy', '{}')$$,
  'P0002', 'review_not_found', 'riders do not review each other');
select is(
  pg_temp.submit('ride', 'c3', 'okay', array['late', 'wrong_fare']) ->> 'state', 'sealed',
  'a rider reviews the organiser'
);

reset role;
update public.stickers set earned_at = now() - interval '8 days' where item_id = (select id from ids where name = 'ride');
update public.reviews set closes_at = now() - interval '1 day' where item_id = (select id from ids where name = 'ride');
set local role authenticated;

select pg_temp.act_as(pg_temp.u('c3'));
select is(
  (select row(r ->> 'state', r -> 'theirs' ->> 'face') from pg_temp.state('ride', 'ride', 'd4') r),
  row('ended'::text, 'okay'::text),
  'after 7 days a one-sided review is shown and the silent side''s row has ended'
);
select throws_ok($$select pg_temp.submit('ride', 'e5', 'happy', '{}')$$,
  '55000', 'review_closed', 'nobody reviews after the window');
select is(jsonb_array_length(public.pending_reviews()), 0, 'a closed window leaves the pending list');
select is((public.profile_card(pg_temp.u('c3')) ->> 'reviewCount')::integer, 1, 'the window''s end shows the review');

select pg_temp.act_as(pg_temp.u('d4'));
select is(
  (select row(r ->> 'state', r -> 'mine' ->> 'editable') from pg_temp.state('ride', 'ride', 'c3') r),
  row('revealed'::text, 'false'::text),
  'the author''s review is revealed and locked when the window ends'
);

select throws_ok($$select public.reveal_due_reviews()$$, '42501', null, 'clients cannot run the reveal job');
reset role;
select is(public.reveal_due_reviews(), 1, 'the reveal job stamps the overdue review');
select is(
  (select revealed_at = closes_at from public.reviews where item_id = (select id from ids where name = 'ride')), true,
  'the stamped reveal time is the window''s end'
);
select is(public.reveal_due_reviews(), 0, 'running the job again changes nothing');
select is(
  (select row(schedule, command) from cron.job where jobname = 'reviews-reveal'),
  row('*/10 * * * *'::text, 'select public.reveal_due_reviews()'::text), 'the reveal job runs every 10 minutes'
);
select is(has_function_privilege('anon', 'public.submit_review(public.payment_item_kind, uuid, uuid, public.review_face, text[], text)', 'execute'),
  false, 'anon cannot submit a review');
select throws_ok(
  $$set local role authenticated; insert into public.reviews (item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, negative, closes_at)
    values ('bounty', gen_random_uuid(), pg_temp.u('a1'), pg_temp.u('b2'), 'helper', 'happy', false, now())$$,
  '42501', null, 'clients cannot write reviews directly'
);
reset role;

delete from auth.users where id = pg_temp.u('a1');
select is(
  (select count(*) from public.reviews where item_id = (select id from ids where name = 'bounty')), 0::bigint,
  'deleting an account removes the reviews they wrote and received'
);
select is((select count(*) from public.review_replies), 0::bigint, 'and the replies under them');
select is(
  (select count(*) from public.reviews where item_id = (select id from ids where name = 'ride')), 1::bigint,
  'other people''s reviews stay'
);

select * from finish();
rollback;

begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Dina')) v (k, n);

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.v(n integer) returns uuid language sql as $$
  select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.u(k)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_user(k text, statement text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(k);
  execute 'select to_jsonb((' || statement || '))' into answer;
  return answer;
end;
$$;

create function pg_temp.review_report(k text, n integer) returns text language sql as $$
  select format('public.report(null, null, %L, null, %L)', k, pg_temp.v(n));
$$;

insert into public.reviews (
  id, item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, chips, sentence, negative, closes_at, revealed_at
)
values
  (pg_temp.v(1), 'bounty', pg_temp.v(101), pg_temp.u('b2'), pg_temp.u('a1'), 'helper', 'unhappy', '{late,no_heads_up}',
   '等了四十分钟', true, now() - interval '1 day', now() - interval '2 days'),
  (pg_temp.v(2), 'bounty', pg_temp.v(102), pg_temp.u('b2'), pg_temp.u('a1'), 'helper', 'happy', '{on_time}', null, false,
   now() - interval '1 day', now() - interval '2 days'),
  (pg_temp.v(3), 'ride', pg_temp.v(103), pg_temp.u('b2'), pg_temp.u('a1'), 'organiser', 'okay', '{late}', '路线写错了',
   true, now() - interval '1 day', now() - interval '2 days'),
  (pg_temp.v(4), 'bounty', pg_temp.v(104), pg_temp.u('b2'), pg_temp.u('a1'), 'helper', 'unhappy', '{late}', '封存的话',
   true, now() + interval '3 days', null);

set local role authenticated;

select is(
  pg_temp.as_user('c3', pg_temp.review_report('harassment', 1)) ?& array['id'], true, 'a third person can report a shown review'
);
select is(
  (select array_agg(k) from jsonb_object_keys(pg_temp.as_user('c3', pg_temp.review_report('harassment', 3))) k),
  array['id'], 'the answer on a hidden ride review names nobody'
);
select is(
  pg_temp.as_user('a1', pg_temp.review_report('inappropriate', 1)) ?& array['id'], true,
  'the reviewee can report a review about them'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'b2', pg_temp.review_report('other', 1)),
  '22023', 'cannot_report_self', 'nobody reports their own review'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'c3', pg_temp.review_report('other', 4)),
  'P0002', 'review_not_found', 'a sealed review cannot be reported, so its existence is not told'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'c3', pg_temp.review_report('other', 9)),
  'P0002', 'review_not_found', 'an unknown review is not found'
);
select throws_ok(
  format(
    'select pg_temp.as_user(%L, %L)', 'c3',
    format('public.report(%L, null, %L, null, %L)', pg_temp.u('b2'), 'other', pg_temp.v(3))
  ),
  '22023', 'invalid_report', 'naming the true author of a hidden review is refused'
);
select throws_ok(
  format(
    'select pg_temp.as_user(%L, %L)', 'c3',
    format('public.report(%L, null, %L, null, %L)', pg_temp.u('d4'), 'other', pg_temp.v(3))
  ),
  '22023', 'invalid_report', 'naming anyone else is refused the same way, so a guess learns nothing'
);
select throws_ok(
  format(
    'select pg_temp.as_user(%L, %L)', 'c3',
    format('public.report(null, %L, %L, null, %L)', pg_temp.v(50), 'other', pg_temp.v(1))
  ),
  '22023', 'invalid_report', 'a report has one subject'
);

select is(
  pg_temp.as_user('c3', pg_temp.review_report('other', 1)) ->> 'id',
  (select pg_temp.as_user('c3', pg_temp.review_report('harassment', 1)) ->> 'id'),
  'reporting the same review again answers the first report'
);

reset role;
select is(
  (select row(target_id, reason, review_face::text, review_chips, review_sentence, message_id, thread_id)::text
   from public.reports where reporter_id = pg_temp.u('c3') and review_id = pg_temp.v(1)),
  row(pg_temp.u('b2'), 'harassment', 'unhappy', '{late,no_heads_up}'::text[], '等了四十分钟', null::uuid, null::uuid)::text,
  'the report targets the reviewer and copies the face, chips and sentence'
);
select is(
  (select count(*) from public.reports where reporter_id = pg_temp.u('c3')), 2::bigint,
  'a repeat adds no row; two reviews are two reports'
);

set local role authenticated;
select pg_temp.as_user('c3', pg_temp.review_report('other', 2));
select pg_temp.as_user('c3', format('public.report(%L, null, %L)', pg_temp.u('b2'), 'other'));
select pg_temp.as_user('c3', format('public.report(%L, null, %L)', pg_temp.u('b2'), 'harassment'));
reset role;
select is(
  (select count(*) from public.reports where reporter_id = pg_temp.u('c3') and target_id = pg_temp.u('b2')), 4::bigint,
  'three reviews and one person report by the same reporter stand side by side'
);
select is(
  (select count(*) from public.reports where reporter_id = pg_temp.u('c3') and review_id is null), 1::bigint,
  'a person report stays once per person'
);

select is(
  (select array_agg(i ->> 'id' order by i ->> 'id')
   from jsonb_array_elements(pg_temp.as_user('c3', format('public.profile_reviews(%L)', pg_temp.u('a1'))) -> 'items') i),
  array[pg_temp.v(1)::text, pg_temp.v(2)::text, pg_temp.v(3)::text], 'a report hides nothing by itself'
);
select is(
  (select i -> 'reportable' from jsonb_array_elements(
    pg_temp.as_user('c3', format('public.profile_reviews(%L)', pg_temp.u('a1'))) -> 'items') i
   where i ->> 'id' = pg_temp.v(3)::text),
  'true'::jsonb, 'a review someone else wrote is reportable'
);
select is(
  (select i -> 'reportable' from jsonb_array_elements(
    pg_temp.as_user('b2', format('public.profile_reviews(%L)', pg_temp.u('a1'))) -> 'items') i
   where i ->> 'id' = pg_temp.v(3)::text),
  'false'::jsonb, 'a review I wrote is not reportable, even where the author is hidden'
);
select is(
  (select i -> 'reviewer' from jsonb_array_elements(
    pg_temp.as_user('c3', format('public.profile_reviews(%L)', pg_temp.u('a1'))) -> 'items') i
   where i ->> 'id' = pg_temp.v(3)::text),
  'null'::jsonb, 'the ride reviewer stays hidden from third people'
);
select is((select private.ride_review_details_public()), false, 'ride review details stay private (256 A)');

select is(
  (select row(review_face::text, reviewee_id, reviewee_name, target_name)::text from private.report_queue
   where reporter_id = pg_temp.u('c3') and review_id = pg_temp.v(1)),
  row('unhappy', pg_temp.u('a1'), 'Alice', 'Bob')::text, 'the queue shows the copy, the reviewee and the reviewer'
);

select lives_ok(
  $$delete from auth.users where id = pg_temp.u('a1')$$,
  'deleting the reviewee removes the reviews and collides with no report'
);
select is(
  (select row(review_id, review_sentence)::text from public.reports
   where reporter_id = pg_temp.u('c3') and review_id = pg_temp.v(1)),
  row(pg_temp.v(1), '等了四十分钟')::text, 'the report and its copy outlive the review, as a message report does'
);

update public.reports set created_at = now() - interval '1 year 1 minute' where review_id = pg_temp.v(1);
select is(public.expire_report_snapshots(), 1, 'the yearly run clears a review copy');
select is(
  (select row(review_face::text, review_chips, review_sentence, reason)::text from public.reports
   where review_id = pg_temp.v(1) and reporter_id = pg_temp.u('c3')),
  row(null::text, null::text[], null::text, 'harassment')::text, 'the copy is gone and the report stays'
);

select * from finish();
rollback;

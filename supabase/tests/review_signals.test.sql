begin;
select plan(11);

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

create function pg_temp.submit(item text, reviewee text, face text, chips text[], sentence text default null)
returns jsonb language sql as $$
  select public.submit_review(
    case when item = 'ride' then 'ride' else 'bounty' end::public.payment_item_kind,
    (select id from ids where name = item), pg_temp.u(reviewee), face::public.review_face, chips, sentence
  );
$$;

create function pg_temp.signals(k text, kind text, item text) returns bigint language sql security definer as $$
  select count(*) from public.events e
  where e.recipient = pg_temp.u(k) and e.kind = signals.kind and e.subject_id = (select id from ids where name = signals.item);
$$;

create function pg_temp.pushed(kind text) returns boolean language sql security definer as $$
  select bool_or(e.push) from public.events e where e.kind = pushed.kind;
$$;

set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select public.confirm_payment_received((select id from ids where name = 'payment'));

select pg_temp.act_as(pg_temp.u('a1'));
select pg_temp.submit('bounty', 'b2', 'happy', array['on_time']);
select is(pg_temp.signals('b2', 'bounty.reviewed', 'bounty'), 1::bigint, 'a first submit signals the reviewee');
select is(pg_temp.signals('a1', 'bounty.reviewed', 'bounty'), 0::bigint, 'the reviewer gets no signal for a first submit');
select is(pg_temp.pushed('bounty.reviewed'), false, 'a review signal never pushes');

select pg_temp.submit('bounty', 'b2', 'okay', array['late']);
select is(pg_temp.signals('b2', 'bounty.reviewed', 'bounty'), 1::bigint, 'an edit while sealed signals nothing');

select pg_temp.act_as(pg_temp.u('b2'));
select pg_temp.submit('bounty', 'a1', 'happy', '{}');
select is(pg_temp.signals('a1', 'bounty.reviewed', 'bounty'), 1::bigint, 'the reveal signals the first reviewer once');
select is(
  pg_temp.signals('b2', 'bounty.reviewed', 'bounty'), 2::bigint,
  'the second reviewer gets one reveal signal and none for the submit itself'
);

select pg_temp.act_as(pg_temp.u('d4'));
select pg_temp.submit('ride', 'c3', 'happy', array['fair_split']);
select is(pg_temp.signals('c3', 'ride.reviewed', 'ride'), 1::bigint, 'a ride review signals the organiser with the ride id');
select is(pg_temp.signals('e5', 'ride.reviewed', 'ride'), 0::bigint, 'other riders get no signal');

reset role;
update public.reviews set closes_at = now() - interval '1 minute' where item_id = (select id from ids where name = 'ride');
select is(public.reveal_due_reviews(), 1, 'the job reveals the one-sided ride review');
select is(pg_temp.signals('d4', 'ride.reviewed', 'ride'), 1::bigint, 'the job''s reveal signals the reviewer');
select is(pg_temp.signals('c3', 'ride.reviewed', 'ride'), 2::bigint, 'the job''s reveal signals the reviewee');

select * from finish();
rollback;

begin;
select plan(43);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Eve"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farah"}');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.coins(k text, why text) returns bigint language sql security definer as $$
  select coalesce(sum(delta), 0) from public.coin_ledger where user_id = pg_temp.u(k) and reason::text = why;
$$;

create function pg_temp.settle(payer text, payee text, title text) returns void language plpgsql as $$
declare
  payment uuid := public.open_payment('bounty', gen_random_uuid(), title, pg_temp.u(payer), pg_temp.u(payee), 1200,
    'MYR', item_category => 'pickup');
begin
  perform set_config('request.jwt.claim.sub', pg_temp.u(payee)::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(payee), 'role', 'authenticated')::text, true);
  perform public.confirm_payment_received(payment);
end;
$$;

insert into public.payee_methods (user_id, type) values (pg_temp.u('b2'), 'cash'), (pg_temp.u('c3'), 'cash');

select is(public.malaysia_week('2026-11-08 15:59:59+00'), '2026-11-02'::date, 'Sunday 23:59 in Malaysia is still this week');
select is(public.malaysia_week('2026-11-08 16:00:00+00'), '2026-11-09'::date, 'the week turns at Monday 00:00 Malaysia time');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select is(public.weekly_feed_status() ->> 'fedThisWeek', 'false', 'a new user has not fed this week');
select is(
  (select row(r ->> 'status', r ->> 'coins', r ->> 'fedThisWeek') from public.feed_weekly() r),
  row('fed'::text, '6'::text, 'true'::text), 'the first feed of the week grants 1 coin'
);
select is(
  (select row(r ->> 'status', r ->> 'coins') from public.feed_weekly() r),
  row('already_fed'::text, '6'::text), 'a second feed in the same week grants nothing'
);
select is(
  (public.weekly_feed_status() ->> 'nextWeekAt')::timestamptz,
  (public.malaysia_week(now()) + 7)::timestamp at time zone 'Asia/Kuala_Lumpur',
  'the next feed opens next Monday 00:00 Malaysia time'
);
select is(pg_temp.coins('a1', 'weekly_feed'), 1::bigint, 'one weekly_feed row in the ledger');
select throws_ok($$insert into public.weekly_feeds (user_id, week) values (pg_temp.u('a1'), '2026-11-16')$$,
  '42501', null, 'clients cannot write feeds');

reset role;
insert into public.weekly_feeds (user_id, week) values (pg_temp.u('b2'), public.malaysia_week(now()) - 7);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select is(public.feed_weekly() ->> 'status', 'fed', 'last week''s feed does not block this week');
select is(has_function_privilege('anon', 'public.feed_weekly()', 'execute'), false, 'anon cannot feed');

select pg_temp.act_as(pg_temp.u('a1'));
select matches(public.my_invite() ->> 'code', '^[A-HJ-NP-Z2-9]{6}$', 'my code has 6 characters without 0, O, 1 or I');
select is(public.my_invite() ->> 'code', public.my_invite() ->> 'code', 'the code stays the same');
select is(public.my_invite() ->> 'canRedeem', 'true', 'a user without settled items may enter a code');

create temp table codes (k text primary key, code text);
grant all on codes to authenticated;
insert into codes select 'a1', public.my_invite() ->> 'code';
select pg_temp.act_as(pg_temp.u('b2'));
insert into codes select 'b2', public.my_invite() ->> 'code';
select pg_temp.act_as(pg_temp.u('d4'));
insert into codes select 'd4', public.my_invite() ->> 'code';

select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok($$select public.redeem_invite((select code from codes where k = 'a1'))$$, '22023', 'own_code',
  'nobody enters their own code');
select throws_ok($$select public.redeem_invite('ZZZZZZ')$$, 'P0002', 'code_not_found', 'an unknown code is not found');
select throws_ok($$select public.redeem_invite('0O1I')$$, 'P0002', 'code_not_found', 'a malformed code is not found');

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select row(r -> 'redeemed' -> 'inviter' ->> 'name', r ->> 'canRedeem', r -> 'redeemed' ->> 'rewarded')
   from public.redeem_invite(' ' || lower(substr((select code from codes where k = 'a1'), 1, 3)) || ' '
     || lower(substr((select code from codes where k = 'a1'), 4))) r),
  row('Alice Tan'::text, 'false'::text, 'false'::text),
  'a typed code ignores case and spaces and names the inviter'
);
select is(
  public.redeem_invite((select code from codes where k = 'a1')) -> 'redeemed' -> 'inviter' ->> 'name', 'Alice Tan',
  'entering the same code again answers with the stored invite'
);
select throws_ok($$select public.redeem_invite((select code from codes where k = 'd4'))$$, '55000', 'already_redeemed',
  'a second code is refused');

select pg_temp.act_as(pg_temp.u('a1'));
select throws_ok($$select public.redeem_invite((select code from codes where k = 'b2'))$$, '55000', 'mutual_invite',
  'two friends cannot invite each other');
select is(
  (select row(x -> 'person' ->> 'name', x -> 'rewardedAt') from jsonb_array_elements(public.my_invite() -> 'invited') x),
  row('Bob Lim'::text, 'null'::jsonb), 'the inviter sees the friend as not done yet'
);

reset role;
select pg_temp.settle('a1', 'b2', '帮取快递');
select is(pg_temp.coins('b2', 'invite_invitee'), 0::bigint, 'a first item with the inviter earns nothing');
select is(pg_temp.coins('a1', 'invite_inviter'), 0::bigint, 'nor for the inviter');

select pg_temp.settle('e5', 'b2', '帮买文具');
select is(pg_temp.coins('b2', 'invite_invitee'), 3::bigint, 'the friend''s first item with someone else earns them 3');
select is(pg_temp.coins('a1', 'invite_inviter'), 3::bigint, 'and the inviter 3');
select pg_temp.settle('f6', 'b2', '帮打印');
select is(pg_temp.coins('b2', 'invite_invitee') + pg_temp.coins('a1', 'invite_inviter'), 6::bigint,
  'later items earn no more');

set local role authenticated;
select pg_temp.act_as(pg_temp.u('a1'));
select isnt(
  (select x -> 'rewardedAt' from jsonb_array_elements(public.my_invite() -> 'invited') x), 'null'::jsonb,
  'the inviter''s row shows the reward'
);
select pg_temp.act_as(pg_temp.u('e5'));
select is(public.my_invite() ->> 'canRedeem', 'false', 'after a settled item the code field is gone');
select throws_ok($$select public.redeem_invite((select code from codes where k = 'd4'))$$, '55000', 'too_late',
  'a code entered after the first settled item is refused');

reset role;
insert into public.rides (
  id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short, depart_at, currency,
  split_mode, status, settled_at
)
values
  ('10000000-0000-0000-0000-0000000000f1', pg_temp.u('d4'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
   'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', now() - interval '3 hours', 'MYR', 'grab', 'closed', now()),
  ('10000000-0000-0000-0000-0000000000f2', pg_temp.u('c3'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
   'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', now() - interval '2 hours', 'MYR', 'grab', 'closed', now());
insert into public.invites (invitee_id, inviter_id, code)
values (pg_temp.u('c3'), pg_temp.u('d4'), (select code from codes where k = 'd4'));
insert into public.ride_members (ride_id, member_id, status)
values ('10000000-0000-0000-0000-0000000000f1', pg_temp.u('d4'), 'boarded'),
  ('10000000-0000-0000-0000-0000000000f1', pg_temp.u('c3'), 'boarded'),
  ('10000000-0000-0000-0000-0000000000f2', pg_temp.u('c3'), 'boarded'),
  ('10000000-0000-0000-0000-0000000000f2', pg_temp.u('d4'), 'boarded'),
  ('10000000-0000-0000-0000-0000000000f2', pg_temp.u('f6'), 'boarded');
insert into public.stickers (owner_id, item_kind, item_id, role, title)
values (pg_temp.u('c3'), 'ride', '10000000-0000-0000-0000-0000000000f1', 'payer', '双威 → KLIA2');
select is(pg_temp.coins('c3', 'invite_invitee'), 0::bigint, 'a ride organised by the inviter earns nothing');
insert into public.stickers (owner_id, item_kind, item_id, role, title)
values (pg_temp.u('c3'), 'ride', '10000000-0000-0000-0000-0000000000f2', 'payee', '双威 → KLIA2');
select is(
  pg_temp.coins('c3', 'invite_invitee') + pg_temp.coins('d4', 'invite_inviter'), 6::bigint,
  'organising a ride with someone besides the inviter on board earns both'
);

set local role authenticated;
select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select jsonb_agg(x ->> 'reason') from jsonb_array_elements(public.coin_history() -> 'items') x),
  '["help_settled", "help_settled", "invite_invitee", "help_settled", "onboarding_first_help", "weekly_feed", "onboarding_payee_method", "new_user"]'::jsonb,
  'the history lists every ledger row newest first'
);
select is(
  (select row(x ->> 'month', x -> 'item' ->> 'title', x ->> 'delta')
   from jsonb_array_elements(public.coin_history() -> 'items') x where x ->> 'reason' = 'help_settled' limit 1),
  row(to_char(public.malaysia_month(now()), 'YYYY-MM'), '帮打印'::text, '1'::text),
  'each row carries its Malaysia month and the item title'
);
select is(
  (select row(jsonb_array_length(h -> 'items'), h ->> 'hasMore') from public.coin_history(null, 3) h),
  row(3, 'true'::text), 'a page holds the asked number of rows'
);
select is(
  jsonb_array_length(public.coin_history((public.coin_history(null, 3) ->> 'nextCursor')::bigint, 10) -> 'items'), 5,
  'the cursor continues with the rest'
);
select is(
  public.coin_history((public.coin_history(null, 3) ->> 'nextCursor')::bigint, 10) -> 'nextCursor', 'null'::jsonb,
  'the last page has no cursor'
);
select pg_temp.act_as(pg_temp.u('f6'));
select is(
  (select jsonb_agg(x ->> 'reason') from jsonb_array_elements(public.coin_history() -> 'items') x),
  '["new_user"]'::jsonb, 'each user reads only their own history'
);
select throws_ok($$select * from public.invites$$, '42501', null, 'clients cannot read invites directly');
select throws_ok($$select * from public.invite_codes$$, '42501', null, 'clients cannot read invite codes directly');

reset role;
delete from auth.users where id = pg_temp.u('a1');
select is(
  (select inviter_id from public.invites where invitee_id = pg_temp.u('b2')), null::uuid,
  'deleting the inviter keeps the friend''s invite without a name'
);
delete from auth.users where id = pg_temp.u('b2');
select is((select count(*) from public.invites where invitee_id = pg_temp.u('b2')), 0::bigint,
  'deleting the friend removes their invite');
select is((select count(*) from public.weekly_feeds where user_id = pg_temp.u('b2')), 0::bigint,
  'and their feeds');
select is(
  (select count(*) from public.coin_ledger where reason = 'invite_invitee' and user_id is null), 1::bigint,
  'ledger rows stay, anonymised'
);

select * from finish();
rollback;

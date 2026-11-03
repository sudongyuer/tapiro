begin;
select plan(48);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('40000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.as_user(k text, statement text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(pg_temp.u(k));
  execute 'select ' || statement into answer;
  return answer;
end;
$$;

create function pg_temp.departed(n integer, mode public.ride_split_mode, members text[], boarded text[]) returns void
language plpgsql as $$
declare
  k text;
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_ride(
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'Mid Valley Megamall', '谷中城', 3.1180, 101.6770,
    now() + interval '20 minutes', 6, 'MYR', mode
  );
  foreach k in array members loop
    perform pg_temp.act_as(pg_temp.u(k));
    perform public.request_ride(pg_temp.r(n));
    perform pg_temp.act_as(pg_temp.u('a1'));
    perform public.decide_ride_request(pg_temp.r(n), pg_temp.u(k), true);
  end loop;
  perform public.depart_ride(pg_temp.r(n), array(select pg_temp.u(b) from unnest(boarded) as b));
end;
$$;

create function pg_temp.shares(b2 bigint, c3 bigint) returns text language sql as $$
  select format('%L::jsonb', jsonb_build_array(
    jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', b2), jsonb_build_object('memberId', pg_temp.u('c3'), 'minor', c3)
  )::text);
$$;

create function pg_temp.payment_of(n integer, k text) returns uuid language plpgsql as $$
begin
  return (select payment_id from paid_by where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k));
end;
$$;

select pg_temp.departed(1, 'tapiro', array['b2', 'c3', 'd4'], array['b2', 'c3']);
select pg_temp.departed(2, 'grab', array['b2', 'c3', 'd4'], array['b2', 'c3']);
select pg_temp.departed(3, 'tapiro', array['d4'], array[]::text[]);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  pg_temp.r(4), 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113, now() + interval '20 minutes', 4, 'MYR'
);

set local role authenticated;

select throws_ok($$select pg_temp.as_user('b2', 'public.reach_ride(pg_temp.r(1))')$$, '42501', 'not_organiser', 'only the organiser taps 到了');
select throws_ok($$select pg_temp.as_user('a1', 'public.reach_ride(pg_temp.r(4))')$$, '55000', 'invalid_transition', '到了 needs 出发 first');
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 2540) || ')'),
  '55000', 'invalid_transition', 'the split waits for 到了'
);
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(1))$$), '{"status": "arrived"}'::jsonb, '到了 on a Tapiro split opens the split');
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(1))$$), '{"status": "arrived"}'::jsonb, 'a second 到了 answers the first');

select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'b2', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 2540) || ')'),
  '42501', 'not_organiser', 'only the organiser sends the split'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', format('public.send_ride_split(pg_temp.r(1), 7600, %L::jsonb)',
    jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2540))::text)),
  '22023', 'invalid_split', 'every boarded rider needs a row'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', format('public.send_ride_split(pg_temp.r(1), 7600, %L::jsonb)',
    jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2540), jsonb_build_object('memberId', pg_temp.u('c3'), 'minor', 2540),
      jsonb_build_object('memberId', pg_temp.u('d4'), 'minor', 2540))::text)),
  '22023', 'invalid_split', 'a no-show is not split'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(4000, 3700) || ')'),
  '22023', 'invalid_split', 'riders above the total cannot be sent (220 A)'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 0) || ')'),
  '22023', 'invalid_split', 'a zero share cannot be sent'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 99, ' || pg_temp.shares(40, 40) || ')'),
  '22023', 'invalid_split', 'a total below the ride limit is refused'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 2540) || ', ''' || pg_temp.r(1) || '/missing.jpg'')'),
  '22023', 'invalid_ride', 'a receipt that was never uploaded is refused'
);
select is(
  pg_temp.as_user('a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 2540) || ')') - 'riders',
  '{"status": "settling", "totalMinor": 7600, "currency": "MYR", "organiserShare": 2520}'::jsonb,
  'the organiser keeps the remainder of the rounded-up shares'
);
reset role;
select results_eq(
  $$select payer_id, payee_id, amount_minor, currency::text, state::text, title from public.payments
    where item_kind = 'ride' and item_id = pg_temp.r(1) order by payer_id$$,
  $$values (pg_temp.u('b2'), pg_temp.u('a1'), 2540::bigint, 'MYR', 'due', '双威 → 谷中城'),
    (pg_temp.u('c3'), pg_temp.u('a1'), 2540::bigint, 'MYR', 'due', '双威 → 谷中城')$$,
  'one payment per boarded rider, rider to organiser'
);
set local role authenticated;
select is(
  pg_temp.as_user('a1', 'public.send_ride_split(pg_temp.r(1), 7600, ' || pg_temp.shares(2540, 2540) || ')') ->> 'organiserShare',
  '2520', 'a replayed split answers the first'
);
reset role;
select is((select count(*) from public.payments where item_id = pg_temp.r(1)), 2::bigint, 'a replay opens no payment');
create temp table paid_by as select ride_id, member_id, payment_id from public.ride_members where payment_id is not null;
grant select on paid_by to authenticated;
set local role authenticated;
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', 'public.send_ride_split(pg_temp.r(1), 8000, ' || pg_temp.shares(2540, 2540) || ')'),
  '55000', 'invalid_transition', 'a different split after sending is refused'
);

reset role;
insert into storage.objects (bucket_id, name, owner) values ('ride-receipts', pg_temp.r(1) || '/grab.jpg', pg_temp.u('a1'));
set local role authenticated;
select is(
  pg_temp.as_user('a1', format('public.set_ride_receipt(pg_temp.r(1), %L)', pg_temp.r(1) || '/grab.jpg')) ->> 'receipt',
  pg_temp.r(1) || '/grab.jpg', 'the organiser attaches the Grab receipt'
);
select pg_temp.act_as(pg_temp.u('b2'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 1::bigint, 'a boarded rider can open the receipt');
select pg_temp.act_as(pg_temp.u('d4'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 0::bigint, 'a no-show cannot open the receipt');
select is((select count(*) from public.ride_receipts), 0::bigint, 'a no-show does not see the receipt row');
select pg_temp.act_as(pg_temp.u('e5'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 0::bigint, 'an outsider cannot open the receipt');

select is(
  jsonb_path_query_array(pg_temp.as_user('c3', $$public.ride_detail(pg_temp.r(1))$$), '$.settle.riders[*].paid'),
  '["due", "due"]'::jsonb, 'riders see each other''s paid state'
);
select isnt(pg_temp.as_user('c3', $$public.ride_detail(pg_temp.r(1))$$) #>> '{settle,receipt}', null, 'riders see that a receipt is attached');
select hasnt_function('public', 'ride_paid_states', array['uuid'], 'the old paid-states read with every rider''s method and time is gone');
select is(pg_temp.as_user('d4', $$public.ride_detail(pg_temp.r(1))$$) -> 'settle', 'null'::jsonb, 'a no-show does not see paid states');

select is(pg_temp.as_user('b2', $$public.dispute_ride_share(pg_temp.r(1), '我只坐到一半')$$), '{"disputed": true, "note": "我只坐到一半"}'::jsonb, 'a rider taps 金额不对 with a note');
select pg_temp.as_user('b2', $$public.dispute_ride_share(pg_temp.r(1), '我只坐到一半')$$);
reset role;
select is((select count(*) from public.ride_events where ride_id = pg_temp.r(1) and kind = 'share_disputed'), 1::bigint, 'a repeated 金额不对 is logged once');
set local role authenticated;
select throws_ok($$select pg_temp.as_user('d4', 'public.dispute_ride_share(pg_temp.r(1))')$$, '42501', 'not_member', 'a no-show has no share to dispute');
select throws_ok($$select pg_temp.as_user('a1', 'public.dispute_ride_share(pg_temp.r(1))')$$, '42501', 'not_member', 'the organiser has no payment to dispute');

select is(
  pg_temp.as_user('a1', $$public.change_ride_share(pg_temp.r(1), pg_temp.u('b2'), 2000)$$) ->> 'organiserShare', '3060',
  'lowering one rider raises the organiser''s own row'
);
reset role;
select is((select amount_minor from public.payments where id = pg_temp.payment_of(1, 'b2')), 2000::bigint, 'the open payment follows the new share');
set local role authenticated;
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.change_ride_share(pg_temp.r(1), pg_temp.u(''b2''), 5100)')$$,
  '22023', 'invalid_split', 'a change that puts riders above the total is refused'
);
select throws_ok(
  $$select pg_temp.as_user('b2', 'public.change_ride_share(pg_temp.r(1), pg_temp.u(''c3''), 1000)')$$,
  '42501', 'not_organiser', 'only the organiser edits a share'
);

select is(
  pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'b2'))),
  '{"state": "settled", "firstSettled": false, "stickerCount": 0, "rideSettled": false}'::jsonb,
  'an earlier settle of the ride earns no sticker and no celebration'
);
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.change_ride_share(pg_temp.r(1), pg_temp.u(''b2''), 2100)')$$,
  '55000', 'invalid_transition', 'a settled share no longer changes'
);
select is(
  pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'c3'))),
  '{"state": "settled", "firstSettled": true, "stickerCount": 1, "rideSettled": true}'::jsonb,
  'the last settle closes the ride and celebrates once'
);
reset role;
select ok(
  (select status = 'closed' and settled_at is not null from public.rides where id = pg_temp.r(1)), 'the ride is closed and settled'
);
select results_eq(
  $$select owner_id, role::text, title from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(1) order by owner_id$$,
  $$values (pg_temp.u('a1'), 'payee', '双威 → 谷中城'), (pg_temp.u('b2'), 'payer', '双威 → 谷中城'), (pg_temp.u('c3'), 'payer', '双威 → 谷中城')$$,
  'one car sticker for everyone who boarded, the no-show gets none'
);
set local role authenticated;
select throws_ok($$select pg_temp.as_user('b2', 'public.dispute_ride_share(pg_temp.r(1))')$$, '55000', 'invalid_transition', '金额不对 is gone once the ride is settled');

select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(2))$$), '{"status": "closed"}'::jsonb, 'a Grab-split ride settles at 到了');
reset role;
select is((select count(*) from public.payments where item_id = pg_temp.r(2)), 0::bigint, 'a Grab-split ride opens no payment');
select is(
  (select array_agg(owner_id order by owner_id) from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(2)),
  array[pg_temp.u('a1'), pg_temp.u('b2'), pg_temp.u('c3')], 'a Grab-split ride gives each boarded person a car sticker'
);
select is(
  (select array_agg(kind::text order by id) from public.ride_events where ride_id = pg_temp.r(2) and kind in ('reached', 'settled')),
  array['reached', 'settled'], 'the Grab-split settle is logged'
);
set local role authenticated;
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(2))$$), '{"status": "closed"}'::jsonb, 'a second 到了 answers the first');
select is(pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(3))$$), '{"status": "closed"}'::jsonb, 'an organiser who rode alone has nothing to split');
reset role;
select is(
  (select count(*) from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(3)), 0::bigint,
  'a lone organiser gets no car sticker'
);
set local role authenticated;
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', format('public.set_ride_receipt(pg_temp.r(2), %L)', pg_temp.r(2) || '/x.jpg')),
  '55000', 'invalid_transition', 'a closed ride takes no receipt'
);

select * from finish();
rollback;

begin;
select plan(47);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000a1', 'cash');
insert into public.payee_methods (id, user_id, type, phone, display_name)
values ('00000000-0000-4000-8000-0000000000a9', '00000000-0000-0000-0000-0000000000a1', 'duitnow_id', '+60123456789', 'ALICE');

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('41000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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
    pg_temp.r(n), 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
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

create function pg_temp.split(n integer, total bigint, riders jsonb, receipt text default null) returns jsonb
language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  return public.send_ride_split(pg_temp.r(n), total, riders, receipt);
end;
$$;

create function pg_temp.detail(k text, n integer) returns jsonb language sql as $$
  select pg_temp.as_user(k, format('public.ride_detail(%L)', pg_temp.r(n)));
$$;

create function pg_temp.payment_of(n integer, k text) returns uuid language sql security definer as $$
  select payment_id from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

select pg_temp.departed(1, 'tapiro', array['b2', 'c3', 'd4'], array['b2', 'c3']);
select pg_temp.departed(2, 'tapiro', array['b2', 'c3'], array['b2']);
select pg_temp.departed(3, 'grab', array['b2'], array['b2']);
select pg_temp.act_as(pg_temp.u('a1'));
select public.reach_ride(pg_temp.r(1));
select public.reach_ride(pg_temp.r(2));
insert into storage.objects (bucket_id, name, owner) values ('ride-receipts', pg_temp.r(1) || '/grab.jpg', pg_temp.u('a1'));

create function pg_temp.due_minor(payment uuid) returns bigint language sql security definer as $fn$
  select amount_minor from public.payments where id = payment;
$fn$;

set local role authenticated;

select is(pg_temp.detail('a1', 1) -> 'settle', 'null'::jsonb, 'before the split is sent there is no settle block');
select is(pg_temp.detail('a1', 1) ->> 'currency', 'MYR', 'the split sheet knows the ride currency without an estimate');
select pg_temp.split(1, 7400, jsonb_build_array(
  jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2470), jsonb_build_object('memberId', pg_temp.u('c3'), 'minor', 2470)
), pg_temp.r(1) || '/grab.jpg');

select is(
  (pg_temp.detail('a1', 1) -> 'settle') - 'riders' - 'sentAt',
  jsonb_build_object('totalMinor', 7400, 'currency', 'MYR', 'organiserShare', 2460, 'receipt', pg_temp.r(1) || '/grab.jpg'),
  'the organiser reads the total, the remainder and the receipt'
);
select is(
  jsonb_path_query_array(pg_temp.detail('a1', 1), '$.settle.riders[*].paymentId'),
  to_jsonb(array[pg_temp.payment_of(1, 'b2'), pg_temp.payment_of(1, 'c3')]),
  'the organiser reads every rider''s payment'
);
select is(
  jsonb_path_query_array(pg_temp.detail('c3', 1), '$.settle.riders[*].paid'), '["due", "due"]'::jsonb,
  'a boarded rider sees each rider''s paid status'
);
select is(
  jsonb_path_query_array(pg_temp.detail('c3', 1), '$.settle.riders[*].paymentId'), to_jsonb(array[pg_temp.payment_of(1, 'c3')]),
  'a rider reads only their own payment id'
);
select is(pg_temp.detail('c3', 1) #>> '{settle,receipt}', pg_temp.r(1) || '/grab.jpg', 'a boarded rider reads the receipt path');
select is(pg_temp.detail('c3', 1) -> 'myShare', '2470'::jsonb, 'a rider reads their own share');
select is(pg_temp.detail('d4', 1) -> 'role', '"noShow"'::jsonb, 'the no-show still reads their own ride');
select is(pg_temp.detail('d4', 1) -> 'settle', 'null'::jsonb, 'a no-show sees no paid status and no receipt');
select is(pg_temp.detail('d4', 1) -> 'myShare', 'null'::jsonb, 'a no-show sees no share');
select throws_ok($$select pg_temp.detail('e5', 1)$$, 'P0002', 'ride_not_found', 'an outsider cannot read a departed ride');

select pg_temp.act_as(pg_temp.u('d4'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 0::bigint, 'a no-show cannot open the receipt file');
select pg_temp.act_as(pg_temp.u('e5'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 0::bigint, 'an outsider cannot open the receipt file');
select pg_temp.act_as(pg_temp.u('c3'));
select is((select count(*) from storage.objects where bucket_id = 'ride-receipts'), 1::bigint, 'a boarded rider opens the receipt file');

select pg_temp.as_user('b2', $$public.dispute_ride_share(pg_temp.r(1), '我只坐到一半')$$);
select is(
  jsonb_path_query_first(pg_temp.detail('a1', 1), '$.settle.riders[0].dispute.note'), '"我只坐到一半"'::jsonb,
  'the organiser reads the 金额不对 note on that rider''s row'
);
select is(
  jsonb_path_query_first(pg_temp.detail('b2', 1), '$.settle.riders[0].dispute.note'), '"我只坐到一半"'::jsonb,
  'the rider reads their own 金额不对 note'
);
select is(
  jsonb_path_query_array(pg_temp.detail('c3', 1), '$.settle.riders[0].dispute'), '[]'::jsonb,
  'another rider does not read the 金额不对 note'
);
select pg_temp.as_user('a1', $$public.change_ride_share(pg_temp.r(1), pg_temp.u('b2'), 2000)$$);
select is(
  jsonb_path_query_first(pg_temp.detail('a1', 1), '$.settle.riders[0].dispute'), 'null'::jsonb,
  'a changed share clears the open 金额不对 note'
);

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  public.mark_payment_paid(pg_temp.payment_of(1, 'b2'), '00000000-0000-4000-8000-0000000000a9', pg_temp.due_minor(pg_temp.payment_of(1, 'b2')))::text, 'marked_paid',
  'the rider marks their share paid'
);
select throws_ok(
  $$select pg_temp.as_user('a1', 'public.change_ride_share(pg_temp.r(1), pg_temp.u(''b2''), 2100)')$$,
  '55000', 'invalid_transition', 'a share marked paid no longer changes'
);
reset role;
select is((select amount_minor from public.payments where id = pg_temp.payment_of(1, 'b2')), 2000::bigint, 'the marked-paid amount is unchanged');
set local role authenticated;
select is(
  jsonb_path_query_array(pg_temp.detail('c3', 1), '$.settle.riders[*].paid'), '["paid", "due"]'::jsonb,
  'another rider sees the share as paid'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'c3', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'b2'))),
  'P0002', null, 'a rider cannot confirm someone else''s payment'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'e5', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'b2'))),
  'P0002', null, 'an outsider cannot touch the ride''s payment'
);
select is(
  pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'b2'))) -> 'rideSettled', 'false'::jsonb,
  'the first 已收到 does not settle the ride'
);
select throws_ok(
  format('select pg_temp.as_user(%L, %L)', 'a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'b2'))),
  '55000', null, 'a second 已收到 on the same payment is refused'
);
select is(
  pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(1, 'c3'))) -> 'rideSettled', 'true'::jsonb,
  'the last 已收到 settles the ride'
);

reset role;
select is(
  (select count(*) from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(1)), 3::bigint,
  'three boarded people, three car stickers'
);
select throws_ok(
  format($$insert into public.stickers (owner_id, item_kind, item_id, role, title) values (%L, 'ride', %L, 'payer', 'x')$$,
    pg_temp.u('b2'), pg_temp.r(1)),
  '23505', null, 'a second sticker for the same person and ride is refused'
);
set local role authenticated;

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select s - 'id' - 'earnedAt' from public.sticker_book() s where s ->> 'itemKind' = 'ride'),
  '{"paymentId": null, "role": "payer", "itemKind": "ride", "category": null, "art": null, "title": "双威 → KLIA2", "counterpartName": "Alice"}'::jsonb,
  'the rider''s sticker book shows the ride sticker with the organiser'
);
select is(
  (select s -> 'amount' from public.settled_cards() s where s ->> 'itemKind' = 'ride'),
  '{"minor": 2000, "currency": "MYR"}'::jsonb,
  'the rider''s settled card shows the share they paid'
);
select is(
  (select s ->> 'paymentId' from public.settled_cards() s where s ->> 'itemKind' = 'ride'), pg_temp.payment_of(1, 'b2')::text,
  'the settled card points at the rider''s payment'
);
select is(pg_temp.detail('b2', 1) #> '{sticker,collected}', 'false'::jsonb, 'the rider''s sticker waits for 收进贴纸本');
select pg_temp.act_as(pg_temp.u('b2'));
select public.collect_sticker((pg_temp.detail('b2', 1) #>> '{sticker,id}')::uuid);
select is(pg_temp.detail('b2', 1) #> '{sticker,collected}', 'true'::jsonb, '收进贴纸本 collects the ride sticker');
select pg_temp.act_as(pg_temp.u('a1'));
select is(
  (select s ->> 'counterpartName' from public.sticker_book() s where s ->> 'itemKind' = 'ride'), 'Bob',
  'the organiser''s ride sticker names the earliest rider'
);
select is(
  (select count(*) from public.settled_cards() s where s ->> 'itemKind' = 'ride'), 0::bigint,
  'the organiser gets the celebration, not a settled card'
);

select is(
  (select i -> 'myShare' from jsonb_array_elements(pg_temp.as_user('b2', 'public.my_rides()') -> 'items') i
   where i ->> 'id' = pg_temp.r(1)::text),
  '2000'::jsonb, 'the settled ticket carries what the rider paid'
);
select is(
  (select i ->> 'myPaid' from jsonb_array_elements(pg_temp.as_user('b2', 'public.my_rides()') -> 'items') i
   where i ->> 'id' = pg_temp.r(1)::text),
  'settled', 'the settled ticket knows the rider settled'
);

select pg_temp.split(2, 5000, jsonb_build_array(jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2500)));
select pg_temp.as_user('c3', $$public.appeal_ride_no_show(pg_temp.r(2))$$);
select pg_temp.as_user('b2', format('public.confirm_ride_appeal(%L, %L)', pg_temp.r(2), pg_temp.u('c3')));
select is(
  jsonb_array_length(pg_temp.detail('c3', 2) #> '{settle,riders}'), 1,
  'a late boarder sees the split as sent, without a row of their own'
);
select is(
  pg_temp.as_user('a1', format('public.confirm_payment_received(%L)', pg_temp.payment_of(2, 'b2'))) -> 'rideSettled', 'true'::jsonb,
  'the only payment settles the ride'
);
reset role;
select is(
  (select array_agg(owner_id order by owner_id) from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(2)),
  array[pg_temp.u('a1'), pg_temp.u('b2')], 'a member who boarded after the split gets no car sticker'
);
set local role authenticated;

select pg_temp.as_user('a1', $$public.reach_ride(pg_temp.r(3))$$);
select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select count(*) from public.sticker_book() s where s ->> 'title' = '双威 → KLIA2'), 3::bigint,
  'the Grab-split ride sticker is in the book too'
);
select is(
  (select count(*) from public.settled_cards() s where s ->> 'itemKind' = 'ride'), 1::bigint,
  'a Grab-split ride has no settled card'
);
select is(pg_temp.detail('b2', 3) -> 'settle', 'null'::jsonb, 'a Grab-split ride has no split to show');

reset role;
insert into public.payee_methods (user_id, type) values (pg_temp.u('c3'), 'cash');
create temp table bounty_pay as
select public.open_payment('bounty', gen_random_uuid(), '帮取快递', pg_temp.u('d4'), pg_temp.u('c3'), 1200, 'MYR', item_category => 'pickup') as id;
grant select on bounty_pay to authenticated;
set local role authenticated;
select is(
  pg_temp.as_user('c3', format('public.confirm_payment_received(%L)', (select id from bounty_pay))),
  '{"state": "settled", "firstSettled": true, "stickerCount": 2}'::jsonb,
  'a bounty settle still answers without a ride flag'
);
select pg_temp.act_as(pg_temp.u('d4'));
select is(
  (select s - 'id' - 'earnedAt' from public.sticker_book() s),
  jsonb_build_object('paymentId', (select id from bounty_pay), 'role', 'payer', 'itemKind', 'bounty', 'category', 'pickup',
    'art', null, 'title', '帮取快递', 'counterpartName', 'Chen'),
  'a bounty sticker still names the payee and points at its payment'
);

select * from finish();
rollback;

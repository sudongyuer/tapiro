begin;
select plan(44);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

insert into public.payee_methods (user_id, type)
values ('00000000-0000-0000-0000-0000000000b2', 'cash'), ('00000000-0000-0000-0000-0000000000a1', 'cash');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('parcel', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 1200, 'MYR', item_category => 'pickup')),
  ('ride', public.open_payment('ride', gen_random_uuid(), '拼车回 YC', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 850, 'MYR'));

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

select is((select count(*) from public.stickers), 0::bigint, 'a payee without settled payments has no stickers');
select is(
  public.confirm_payment_received((select id from ids where name = 'parcel')),
  '{"state": "settled", "firstSettled": true, "stickerCount": 1}'::jsonb,
  'the first settle earns the first sticker'
);
select is(
  (select row(owner_id, role::text, item_kind::text, title, category::text) from public.stickers),
  row('00000000-0000-0000-0000-0000000000b2'::uuid, 'payee'::text, 'bounty'::text, '帮取快递'::text, 'pickup'::text),
  'the payee''s sticker snapshots the kind, the title and the payment''s category'
);
select is(
  (select payment_id from public.stickers), (select id from ids where name = 'parcel'),
  'the sticker points at its payment'
);
select throws_ok(
  $$select public.confirm_payment_received((select id from ids where name = 'parcel'))$$,
  '55000', null, 'a replayed settle is rejected'
);
select is((select count(*) from public.stickers), 1::bigint, 'a replayed settle adds no second sticker');
select is(
  public.confirm_payment_received((select id from ids where name = 'ride')),
  '{"state": "settled", "firstSettled": false, "stickerCount": 2}'::jsonb,
  'a later settle returns the new count and is not first'
);
select is(
  (select item_kind::text from public.stickers where payment_id = (select id from ids where name = 'ride')), 'ride',
  'a ride settle earns a ride sticker'
);

select throws_ok(
  $$insert into public.stickers (owner_id, payment_id, item_kind, title)
    values ('00000000-0000-0000-0000-0000000000b2', (select id from ids where name = 'parcel'), 'bounty', 'x')$$,
  '42501', null, 'a client cannot insert a sticker'
);
select throws_ok(
  $$update public.stickers set title = '改名'$$,
  '42501', null, 'a client cannot change a sticker'
);
select throws_ok(
  $$delete from public.stickers$$,
  '42501', null, 'a client cannot delete a sticker'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select results_eq(
  $$select payment_id, role::text from public.stickers$$,
  $$select id, 'payer' from ids where name = 'parcel'$$,
  'the payer reads only their own payer sticker'
);

reset role;
select results_eq(
  $$select owner_id, role::text, item_kind::text, title, category::text from public.stickers
    where payment_id = (select id from ids where name = 'parcel') order by role$$,
  $$values ('00000000-0000-0000-0000-0000000000b2'::uuid, 'payee', 'bounty', '帮取快递', 'pickup'),
           ('00000000-0000-0000-0000-0000000000a1'::uuid, 'payer', 'bounty', '帮取快递', 'pickup')$$,
  'one settle writes a sticker for each side with the payment''s category, and the replay added none'
);
insert into ids values ('reverse', public.open_reverse_payment((select id from ids where name = 'parcel')));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  public.confirm_payment_received((select id from ids where name = 'reverse')),
  '{"state": "settled", "firstSettled": false, "stickerCount": 1}'::jsonb,
  'settling a reverse payment earns no sticker, is not a first settle and counts the payer''s existing sticker'
);
select is(
  (select count(*) from public.stickers where payment_id = (select id from ids where name = 'reverse')), 0::bigint,
  'the poster paid back holds no sticker for the reverse payment'
);

reset role;
insert into ids values
  ('help', public.open_payment('bounty', gen_random_uuid(), '帮忙排队', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 500, 'MYR', item_category => 'queue'));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  public.confirm_payment_received((select id from ids where name = 'help')),
  '{"state": "settled", "firstSettled": true, "stickerCount": 2}'::jsonb,
  'a user who paid first gets the first settle on their first help, counting the whole book'
);

reset role;
select is(
  (select count(*) from public.stickers where owner_id = '00000000-0000-0000-0000-0000000000b2'), 2::bigint,
  'the helper keeps the stickers of the original payments after a reversal'
);
select throws_ok(
  $$insert into public.stickers (owner_id, payment_id, role, item_kind, title)
    values ('00000000-0000-0000-0000-0000000000b2', (select id from ids where name = 'parcel'), 'payer', 'bounty', '帮取快递')$$,
  '23505', null, 'one owner holds at most one sticker per payment'
);
select throws_ok(
  $$insert into public.stickers (owner_id, payment_id, role, item_kind, category, title)
    values ('00000000-0000-0000-0000-0000000000a1', (select id from ids where name = 'ride'), 'payer', 'ride', 'parcel', '拼车回 YC')$$,
  '23514', null, 'a sticker category is one of the eight slugs'
);
insert into ids values
  ('pre', public.open_payment('bounty', gen_random_uuid(), '帮忙排队', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 600, 'MYR')),
  ('old', public.open_payment('ride', gen_random_uuid(), '拼车去 Sunway', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 700, 'MYR'));
insert into public.stickers (owner_id, payment_id, role, item_kind, title)
values ('00000000-0000-0000-0000-0000000000b2', (select id from ids where name = 'pre'), 'payee', 'bounty', '帮忙排队');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.confirm_payment_received((select id from ids where name = 'pre')),
  '{"state": "settled", "firstSettled": false, "stickerCount": 3}'::jsonb,
  'settling a payment that already holds a sticker keeps that one sticker'
);
reset role;
select is(
  (select count(*) from public.stickers
   where payment_id = (select id from ids where name = 'pre') and owner_id = '00000000-0000-0000-0000-0000000000b2'),
  1::bigint,
  'the existing sticker row is not duplicated'
);
update public.payments set state = 'settled', settled_at = now() - interval '3 days', method_type = 'cash'
where id = (select id from ids where name = 'old');
select is(public.award_missing_stickers(), 2, 'the backfill awards both sides of a settled payment that has no stickers');
select results_eq(
  $$select owner_id, role::text, item_kind::text, title from public.stickers
    where payment_id = (select id from ids where name = 'old') order by role$$,
  $$values ('00000000-0000-0000-0000-0000000000b2'::uuid, 'payee', 'ride', '拼车去 Sunway'),
           ('00000000-0000-0000-0000-0000000000a1'::uuid, 'payer', 'ride', '拼车去 Sunway')$$,
  'the backfill gives the payee and the payer a sticker each with the payment''s kind and title'
);
select is(
  (select count(*) from public.stickers where payment_id = (select id from ids where name = 'reverse')), 0::bigint,
  'the backfill leaves the settled reverse payment without a sticker'
);
insert into ids values
  ('gone', public.open_payment('bounty', gen_random_uuid(), '帮忙搬宿舍', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 2000, 'MYR', item_category => 'move'));
insert into ids values
  ('orphan', public.open_payment('bounty', gen_random_uuid(), '帮忙拿外卖', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 900, 'MYR'));
update public.payments set state = 'settled', settled_at = now(), method_type = 'cash'
where id = (select id from ids where name = 'gone');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';
select is(public.award_missing_stickers(), 1, 'the backfill gives a payment whose payer was deleted only the payee''s sticker');
select results_eq(
  $$select owner_id, role::text, category::text from public.stickers
    where payment_id = (select id from ids where name = 'gone')$$,
  $$values ('00000000-0000-0000-0000-0000000000b2'::uuid, 'payee', 'move')$$,
  'the backfilled sticker carries the payment''s category'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.confirm_payment_received((select id from ids where name = 'orphan'));
reset role;
select results_eq(
  $$select owner_id, role::text from public.stickers where payment_id = (select id from ids where name = 'orphan')$$,
  $$values ('00000000-0000-0000-0000-0000000000b2'::uuid, 'payee')$$,
  'a settle whose payer was deleted writes only the payee''s sticker'
);
delete from auth.users where id = '00000000-0000-0000-0000-0000000000b2';
select is(
  (select count(*) from public.stickers where owner_id = '00000000-0000-0000-0000-0000000000b2'), 0::bigint,
  'deleting the account deletes its stickers'
);

reset role;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Erin"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Faiz"}'),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'g@example.com', '{"full_name":"Gwen"}'),
  ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h@example.com', '{"full_name":"Hana"}');
insert into public.payee_methods (id, user_id, type, display_name, qr_payload)
values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-0000000000f6', 'alipay', 'Faiz', 'https://qr.alipay.com/faiz'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-0000-0000-0000000000f6', 'cash', null, null);
delete from public.fx_rates;
insert into public.fx_rates (base, quote, rate_date, source, quote_per_base)
values ('CNY', 'MYR', (now() at time zone 'Asia/Kuala_Lumpur')::date, 'bnm', 0.5);
insert into public.bounties (id, poster_id, title, category, reward_minor, reward_currency, expires_at, art)
values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e5', '帮买奶茶', 'buy', 1500, 'MYR',
  now() + interval '7 days', 'tea');
insert into ids values
  ('tea', public.open_payment('bounty', '70000000-0000-0000-0000-000000000001', '帮买奶茶', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6', 1500, 'MYR', item_category => 'buy')),
  ('fresh', public.open_payment('ride', '70000000-0000-0000-0000-000000000001', '拼车去 KLCC', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6', 800, 'MYR')),
  ('stale', public.open_payment('bounty', gen_random_uuid(), '帮忙排队', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6', 600, 'MYR', item_category => 'queue')),
  ('late', public.open_payment('bounty', gen_random_uuid(), '帮搬箱子', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6', 900, 'MYR', item_category => 'move')),
  ('ghost', public.open_payment('bounty', gen_random_uuid(), '帮拿外卖', '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000f6', 700, 'MYR', item_category => 'pickup'));

create function pg_temp.card_of(n text) returns jsonb language sql as $$
  select c - 'stickerId' - 'earnedAt' from public.settled_cards() c
  where c ->> 'paymentId' = (select id from ids where name = n)::text;
$$;
create function pg_temp.book_of(n text) returns jsonb language sql as $$
  select b - 'id' - 'earnedAt' - 'paymentId' from public.sticker_book() b
  where b ->> 'paymentId' = (select id from ids where name = n)::text;
$$;
create function pg_temp.payer_sticker(n text) returns uuid language sql as $$
  select s.id from public.stickers s
  where s.payment_id = (select id from ids where name = n) and s.role = 'payer';
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select public.mark_payment_paid((select id from ids where name = 'tea'), '00000000-0000-4000-8000-0000000000f1');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f6');
select public.confirm_payment_received((select id from ids where name = 'tea'));
select public.confirm_payment_received((select id from ids where name = 'ghost'));

select is(
  pg_temp.book_of('tea'),
  '{"role": "payee", "itemKind": "bounty", "category": "buy", "art": "tea", "title": "帮买奶茶", "counterpartName": "Erin"}'::jsonb,
  'the payee''s book row names the payer'
);
select is((select count(*) from public.settled_cards()), 0::bigint, 'the payee gets no settled card');
select throws_ok(
  format('select public.collect_sticker(%L)', (select s.id from public.stickers s join ids on ids.id = s.payment_id where ids.name = 'tea')),
  'P0002', 'sticker_not_found', 'a payee row cannot be collected'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(
  pg_temp.book_of('tea'),
  '{"role": "payer", "itemKind": "bounty", "category": "buy", "art": "tea", "title": "帮买奶茶", "counterpartName": "Faiz"}'::jsonb,
  'the payer''s book row names the payee'
);
select is(
  pg_temp.card_of('tea'),
  jsonb_build_object(
    'paymentId', (select id from ids where name = 'tea'), 'itemKind', 'bounty', 'category', 'buy', 'art', 'tea', 'title', '帮买奶茶',
    'counterpartName', 'Faiz', 'amount', '{"minor": 3000, "currency": "CNY"}'::jsonb
  ),
  'a settle shows the payer a card with the amount in the currency paid, not the item''s RM'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a8');
select is((select count(*) from public.sticker_book()), 0::bigint, 'another user reads nothing from the book');
select is((select count(*) from public.settled_cards()), 0::bigint, 'another user reads no settled cards');
select throws_ok(
  format('select public.collect_sticker(%L)', pg_temp.payer_sticker('tea')),
  'P0002', 'sticker_not_found', 'another user cannot collect the payer''s sticker'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(public.collect_sticker(pg_temp.payer_sticker('tea')), '{"collected": true}'::jsonb, 'the payer collects the sticker');
select is(pg_temp.card_of('tea'), null, 'a collected sticker leaves no card');
reset role;
update public.stickers set collected_at = '2026-10-01 00:00+00' where id = pg_temp.payer_sticker('tea');
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select is(public.collect_sticker(pg_temp.payer_sticker('tea')), '{"collected": true}'::jsonb, 'collecting again succeeds');
reset role;
select is(
  (select collected_at from public.stickers where id = pg_temp.payer_sticker('tea')), '2026-10-01 00:00+00'::timestamptz,
  'collecting again keeps the first collected time'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000000a7';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f6');
select is(
  pg_temp.book_of('ghost'),
  '{"role": "payee", "itemKind": "bounty", "category": "pickup", "art": null, "title": "帮拿外卖", "counterpartName": null}'::jsonb,
  'a deleted counterpart reads as no name'
);
select public.confirm_payment_received((select id from ids where name = 'fresh'));
select public.confirm_payment_received((select id from ids where name = 'stale'));
reset role;
update public.stickers set earned_at = now() - interval '8 days' where id = pg_temp.payer_sticker('stale');
update public.payments set state = 'settled', settled_at = now() - interval '1 day', method_type = 'cash'
where id = (select id from ids where name = 'late');
select public.award_missing_stickers();
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select results_eq(
  $$select (c ->> 'paymentId')::uuid from public.settled_cards() c$$,
  $$select id from ids where name = 'fresh'$$,
  'only the fresh settle shows: the 8-day-old and the backfilled settles leave no card'
);
select is(
  pg_temp.card_of('fresh') -> 'art', 'null'::jsonb, 'a ride card has no art, even when its id matches a bounty'
);
reset role;
select is(
  (select collected_at is not null from public.stickers where id = pg_temp.payer_sticker('stale')), true,
  'reading the cards marks a payer sticker older than 7 days collected'
);

select * from finish();
rollback;

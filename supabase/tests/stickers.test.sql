begin;
select plan(28);

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
  ('parcel', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 1200, item_category => 'pickup')),
  ('ride', public.open_payment('ride', gen_random_uuid(), '拼车回 YC', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 850));

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
  ('help', public.open_payment('bounty', gen_random_uuid(), '帮忙排队', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 500, item_category => 'queue'));
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
  ('pre', public.open_payment('bounty', gen_random_uuid(), '帮忙排队', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 600)),
  ('old', public.open_payment('ride', gen_random_uuid(), '拼车去 Sunway', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 700));
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
  ('gone', public.open_payment('bounty', gen_random_uuid(), '帮忙搬宿舍', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 2000, item_category => 'move'));
insert into ids values
  ('orphan', public.open_payment('bounty', gen_random_uuid(), '帮忙拿外卖', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 900));
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

select * from finish();
rollback;

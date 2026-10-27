begin;
select plan(82);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farid"}'),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'g@example.com', '{"full_name":"Grace"}'),
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h@example.com', '{"full_name":"Hafiz"}');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.balance_of(uid uuid) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(uid);
  return public.coin_balance();
end;
$$;

create function pg_temp.coins_of(uid uuid) returns integer language sql as $$
  select (pg_temp.balance_of(uid) ->> 'coins')::integer;
$$;

create function pg_temp.drain(uid uuid) returns void language plpgsql as $$
begin
  while pg_temp.coins_of(uid) > 0 loop
    perform public.spend_post(uid, 'bounty', gen_random_uuid());
  end loop;
end;
$$;

create function pg_temp.settled_payment(kind public.payment_item_kind, payer uuid, payee uuid) returns uuid
language plpgsql as $$
declare
  opened uuid := public.open_payment(kind, gen_random_uuid(), '帮取快递', payer, payee, 1000);
begin
  update public.payments set state = 'settled', settled_at = now(), method_type = 'cash' where id = opened;
  return opened;
end;
$$;

create function pg_temp.help_rows(uid uuid, at timestamptz, n integer) returns void language sql as $$
  insert into public.coin_ledger (user_id, reason, delta, item_kind, item_id, created_at)
  select uid, 'help_settled', 1, 'bounty', gen_random_uuid(), at from generate_series(1, n);
$$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('f1', gen_random_uuid()), ('f2', gen_random_uuid()), ('f3', gen_random_uuid()), ('c1', gen_random_uuid()),
  ('c2', gen_random_uuid()), ('f4', gen_random_uuid()), ('d1', gen_random_uuid());
create temp table counts (name text primary key, n bigint);
grant all on counts to authenticated;

select is(
  array[
    public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f1')),
    public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f2')),
    public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f3'))
  ],
  array['free', 'free', 'free'], 'the first three posts in a Malaysia month are free'
);
select is(
  (select count(*) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000a1' and reason = 'onboarding_first_post' and delta = 1),
  1::bigint, 'the first post grants one onboarding coin'
);

insert into counts values ('before_coin', pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1'));
select is(
  public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'c1')),
  'coin', 'the fourth post with a coin is paid with a coin'
);
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1')::bigint, (select n - 1 from counts where name = 'before_coin'),
  'a coin post costs one coin'
);
select is(
  (select row(delta, item_kind::text, item_id) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000a1' and reason = 'post_spend'),
  row(-1, 'bounty'::text, (select id from ids where name = 'c1')), 'the spend row names the item'
);

select pg_temp.drain('00000000-0000-0000-0000-0000000000a1');
select is(pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1'), 0, 'the poster has spent every coin');
insert into counts values
  ('ledger', (select count(*) from public.coin_ledger)),
  ('charges', (select count(*) from public.post_charges));
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', gen_random_uuid())$$,
  '55000', 'no_balance', 'without a free slot or a coin the post is rejected'
);
select is(
  (select count(*) from public.coin_ledger), (select n from counts where name = 'ledger'),
  'a rejected spend writes no ledger row'
);
select is(
  (select count(*) from public.post_charges), (select n from counts where name = 'charges'),
  'a rejected spend writes no charge'
);

select is(
  private.grant_coins('00000000-0000-0000-0000-0000000000a1', 'help_settled', 1, 'bounty', gen_random_uuid()), true,
  'a grant reports that it wrote a row'
);
select is(
  public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'c2')),
  'coin', 'after a +1 grant the next post is paid with a coin'
);
select is(pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1'), 0, 'the granted coin is spent');
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000a1', 'ride', gen_random_uuid())$$,
  '55000', 'no_balance', 'with the balance back at zero the next post is rejected'
);

select is(
  array[
    public.spend_post('00000000-0000-0000-0000-0000000000b2', 'bounty', gen_random_uuid()),
    public.spend_post('00000000-0000-0000-0000-0000000000b2', 'bounty', gen_random_uuid()),
    public.spend_post('00000000-0000-0000-0000-0000000000b2', 'ride', gen_random_uuid())
  ],
  array['free', 'free', 'free'], 'two bounties and a ride are free'
);
select is(
  (pg_temp.balance_of('00000000-0000-0000-0000-0000000000b2') ->> 'freePostsLeft')::integer, 0,
  'bounties and rides share the three free posts'
);
select is(
  public.spend_post('00000000-0000-0000-0000-0000000000b2', 'ride', gen_random_uuid()), 'coin',
  'a ride after the shared allowance is used costs a coin'
);

select is(public.malaysia_month('2026-10-31 16:30+00'), '2026-11-01'::date, '00:30 on 1 November in Malaysia is November');
select is(public.malaysia_month('2026-10-31 15:59+00'), '2026-10-01'::date, '23:59 on 31 October in Malaysia is October');
insert into public.post_charges (item_kind, item_id, user_id, charge, free_month)
values ('bounty', gen_random_uuid(), '00000000-0000-0000-0000-0000000000c3', 'free',
        (public.malaysia_month(now()) - interval '1 month')::date);
select is(
  (pg_temp.balance_of('00000000-0000-0000-0000-0000000000c3') ->> 'freePostsLeft')::integer, 3,
  'a free post from last month leaves this month''s allowance whole'
);

select is(
  public.refund_post('bounty', (select id from ids where name = 'f1')), 'free', 'refunding a free post returns free'
);
select is(
  (pg_temp.balance_of('00000000-0000-0000-0000-0000000000a1') ->> 'freePostsLeft')::integer, 1,
  'a refunded free post gives its slot back'
);
insert into counts values ('before_refund', pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1'));
select is(
  public.refund_post('bounty', (select id from ids where name = 'c1')), 'coin', 'refunding a coin post returns coin'
);
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000a1')::bigint, (select n + 1 from counts where name = 'before_refund'),
  'a refunded coin post gives the coin back'
);
insert into counts values ('after_refund', (select count(*) from public.coin_ledger));
select is(
  public.refund_post('bounty', (select id from ids where name = 'c1')), 'coin', 'a second refund returns the same charge'
);
select is(
  (select count(*) from public.coin_ledger), (select n from counts where name = 'after_refund'),
  'a second refund writes no ledger row'
);
select is(
  (select refunded_at is not null from public.post_charges where item_id = (select id from ids where name = 'c1')),
  true, 'the refund is stamped on the charge'
);
select throws_ok(
  $$select public.refund_post('bounty', gen_random_uuid())$$,
  'P0002', 'charge_not_found', 'refunding an item that was never charged is rejected'
);
select throws_ok(
  $$select public.refund_post(null, gen_random_uuid())$$,
  '22023', 'invalid_charge', 'a refund needs an item kind'
);

select is(
  public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f4')), 'free',
  'the slot a refund freed is used by the next post'
);
select is(
  (select count(*) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000a1' and reason = 'onboarding_first_post'),
  1::bigint, 'spend, refund and spend again grants the first-post coin only once'
);

insert into counts values
  ('replay_ledger', (select count(*) from public.coin_ledger)),
  ('replay_charges', (select count(*) from public.post_charges));
select is(
  array[
    public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f2')),
    public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'c2'))
  ],
  array['free', 'coin'], 'replaying a spend returns the first charge'
);
select is(
  (select count(*) from public.coin_ledger), (select n from counts where name = 'replay_ledger'),
  'a replayed spend writes no ledger row'
);
select is(
  (select count(*) from public.post_charges), (select n from counts where name = 'replay_charges'),
  'a replayed spend writes no charge'
);
select is(
  public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', (select id from ids where name = 'f1')), 'free',
  'replaying a refunded spend returns its charge and does not charge again'
);
select throws_ok(
  format($$select public.spend_post('00000000-0000-0000-0000-0000000000b2', 'bounty', %L)$$,
    (select id from ids where name = 'f2')),
  '22023', 'item_charged_elsewhere', 'an item charged to one poster cannot be charged to another'
);
select throws_ok(
  $$select public.spend_post(null, 'bounty', gen_random_uuid())$$,
  '22023', 'invalid_charge', 'a spend needs a poster'
);
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000a1', 'bounty', null)$$,
  '22023', 'invalid_charge', 'a spend needs an item'
);
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-00000000dead', 'bounty', gen_random_uuid())$$,
  'P0002', 'user_not_found', 'a spend by an unknown poster is rejected'
);

create function public.test_charge_race() returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() = 1 then
    insert into public.post_charges (item_kind, item_id, user_id, charge, free_month)
    values (new.item_kind, new.item_id, '00000000-0000-0000-0000-0000000000b2', 'free', new.free_month);
  end if;
  return new;
end;
$$;
create trigger test_charge_race before insert on public.post_charges
  for each row execute function public.test_charge_race();
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'bounty', gen_random_uuid())$$,
  '22023', 'item_charged_elsewhere', 'a poster who loses the race for an item gets item_charged_elsewhere'
);
drop trigger test_charge_race on public.post_charges;
drop function public.test_charge_race();

select private.grant_coins('00000000-0000-0000-0000-0000000000c3', 'help_settled', 1, 'bounty', gen_random_uuid());
select private.grant_coins('00000000-0000-0000-0000-0000000000c3', 'help_settled', 1, 'bounty', gen_random_uuid());
select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'ride', gen_random_uuid());
insert into counts values ('c3_coins', (select sum(delta) from public.coin_ledger where user_id = '00000000-0000-0000-0000-0000000000c3'));

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.coin_balance()) as k),
  array['coins', 'freePostsLeft', 'freePostsPerMonth', 'nextFreeAt'], 'the balance has four keys'
);
select is(
  (public.coin_balance() ->> 'coins')::bigint, (select n from counts where name = 'c3_coins'),
  'coins is the sum of the client''s ledger'
);
select is(
  (select n from counts where name = 'c3_coins'), 8::bigint, 'the new-user five, two help coins and the first-post coin make eight'
);
select is((public.coin_balance() ->> 'freePostsLeft')::integer, 2, 'one free post this month leaves two');
select is((public.coin_balance() ->> 'freePostsPerMonth')::integer, 3, 'three free posts a month');
select is(
  (public.coin_balance() ->> 'nextFreeAt')::timestamptz,
  ((public.malaysia_month(now()) + interval '1 month')::date::text || ' 00:00:00+08')::timestamptz,
  'the next free post comes at midnight on the 1st in Malaysia'
);
select is(
  (select count(*) from public.coin_ledger), 4::bigint, 'a client reads only its own ledger rows'
);
select throws_ok(
  $$insert into public.coin_ledger (user_id, reason, delta) values ('00000000-0000-0000-0000-0000000000c3', 'new_user', 5)$$,
  '42501', null, 'a client cannot insert a ledger row'
);
select throws_ok(
  $$update public.coin_ledger set delta = 100$$, '42501', null, 'a client cannot update a ledger row'
);
select throws_ok($$delete from public.coin_ledger$$, '42501', null, 'a client cannot delete a ledger row');
select throws_ok(
  $$select count(*) from public.post_charges$$, '42501', null, 'a client cannot read charges'
);
select throws_ok(
  $$select public.spend_post('00000000-0000-0000-0000-0000000000c3', 'bounty', gen_random_uuid())$$,
  '42501', null, 'a client cannot spend'
);
select throws_ok(
  format($$select public.refund_post('bounty', %L)$$, (select id from ids where name = 'f2')),
  '42501', null, 'a client cannot refund'
);
reset role;

select is(
  has_function_privilege('anon', 'public.coin_balance()', 'execute'), false, 'anon cannot read a balance'
);
select is(
  has_function_privilege('authenticated', 'private.grant_coins(uuid, public.coin_reason, integer, public.payment_item_kind, uuid)', 'execute'),
  false, 'a client cannot grant coins'
);
select throws_ok(
  $$update public.coin_ledger set delta = 100 where user_id = '00000000-0000-0000-0000-0000000000c3'$$,
  '55000', 'ledger_is_append_only', 'even the owner cannot change a ledger row'
);
select throws_ok(
  $$delete from public.coin_ledger where user_id = '00000000-0000-0000-0000-0000000000c3'$$,
  '55000', 'ledger_is_append_only', 'even the owner cannot delete a ledger row'
);
select throws_ok(
  $$truncate public.coin_ledger$$, '55000', 'ledger_is_append_only', 'the ledger cannot be truncated'
);

select public.spend_post('00000000-0000-0000-0000-0000000000d4', 'bounty', (select id from ids where name = 'd1'));
insert into counts values
  ('d4_rows', (select count(*) from public.coin_ledger where user_id = '00000000-0000-0000-0000-0000000000d4')),
  ('orphans', (select count(*) from public.coin_ledger where user_id is null)),
  ('b2_coins', pg_temp.coins_of('00000000-0000-0000-0000-0000000000b2'));
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';
select is(
  (select count(*) from public.coin_ledger where user_id is null),
  (select n from counts where name = 'orphans') + (select n from counts where name = 'd4_rows'),
  'a deleted user''s ledger rows stay without a user'
);
select is(
  (select user_id from public.post_charges where item_id = (select id from ids where name = 'd1')), null::uuid,
  'a deleted user''s charges stay without a user'
);
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000b2')::bigint, (select n from counts where name = 'b2_coins'),
  'deleting one account leaves other balances unchanged'
);

select is(pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5'), 5, 'a new account starts with five coins');
select is(
  (select count(*) from public.coin_ledger where user_id = '00000000-0000-0000-0000-0000000000e5'), 1::bigint,
  'the five coins are one new-user row'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000e5', 'cash');
select is((public.coin_balance() ->> 'coins')::integer, 6, 'adding a first payee method, even cash, grants one coin');
insert into public.payee_methods (user_id, type, phone, display_name)
values ('00000000-0000-0000-0000-0000000000e5', 'duitnow_id', '+60123456789', 'EMMA');
select is((public.coin_balance() ->> 'coins')::integer, 6, 'a second payee method grants nothing');
delete from public.payee_methods;
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000e5', 'cash');
select is((public.coin_balance() ->> 'coins')::integer, 6, 'deleting and re-adding a payee method grants nothing');
reset role;

insert into ids values
  ('help1', pg_temp.settled_payment('bounty', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6')),
  ('help2', pg_temp.settled_payment('bounty', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6'));
insert into counts values
  ('e5_before', pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5')),
  ('f6_before', pg_temp.coins_of('00000000-0000-0000-0000-0000000000f6'));
select private.grant_help_settled((select id from ids where name = 'help1'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000f6')::bigint, (select n + 2 from counts where name = 'f6_before'),
  'the first settled help grants the payee the first-help coin and a help coin'
);
select is(
  (select array_agg(reason::text order by reason) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000f6' and reason in ('onboarding_first_help', 'help_settled')),
  array['onboarding_first_help', 'help_settled'], 'the two help grants are one row each'
);
select is(
  (select row(item_kind::text, item_id) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000f6' and reason = 'help_settled'),
  (select row(item_kind::text, item_id) from public.payments where id = (select id from ids where name = 'help1')),
  'the help coin names the bounty'
);
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5')::bigint, (select n from counts where name = 'e5_before'),
  'the payer gets nothing for a settled help'
);
select private.grant_help_settled((select id from ids where name = 'help2'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000f6')::bigint, (select n + 3 from counts where name = 'f6_before'),
  'a second settled help grants only the help coin'
);
select private.grant_help_settled((select id from ids where name = 'help2'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000f6')::bigint, (select n + 3 from counts where name = 'f6_before'),
  'a replay for the same payment grants nothing'
);

insert into ids values
  ('ride', pg_temp.settled_payment('ride', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a7')),
  ('due', public.open_payment('bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a7', 500));
insert into ids values ('reverse', public.open_reverse_payment((select id from ids where name = 'help1')));
update public.payments set state = 'settled', settled_at = now(), method_type = 'cash'
where id = (select id from ids where name = 'reverse');
insert into counts values
  ('a7_before', pg_temp.coins_of('00000000-0000-0000-0000-0000000000a7')),
  ('e5_reverse', pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5'));
select private.grant_help_settled((select id from ids where name = 'ride'));
select private.grant_help_settled((select id from ids where name = 'due'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000a7')::bigint, (select n from counts where name = 'a7_before'),
  'a settled ride and an unsettled bounty grant nothing'
);
select private.grant_help_settled((select id from ids where name = 'reverse'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000e5')::bigint, (select n from counts where name = 'e5_reverse'),
  'a settled reverse payment grants nothing'
);

select pg_temp.help_rows(
  '00000000-0000-0000-0000-0000000000a7',
  (public.malaysia_month(now())::timestamp at time zone 'Asia/Kuala_Lumpur') + interval '1 second', 9
);
select pg_temp.help_rows(
  '00000000-0000-0000-0000-0000000000a7',
  (public.malaysia_month(now())::timestamp at time zone 'Asia/Kuala_Lumpur') - interval '1 second', 1
);
insert into ids values
  ('tenth', pg_temp.settled_payment('bounty', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a7')),
  ('eleventh', pg_temp.settled_payment('bounty', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a7'));
select private.grant_help_settled((select id from ids where name = 'tenth'));
select is(
  (select count(*) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000a7' and reason = 'help_settled'
     and item_id = (select item_id from public.payments where id = (select id from ids where name = 'tenth'))),
  1::bigint, 'with nine this month and one last month the tenth help is granted'
);
select private.grant_help_settled((select id from ids where name = 'eleventh'));
select is(
  (select count(*) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000a7' and reason = 'help_settled'
     and item_id = (select item_id from public.payments where id = (select id from ids where name = 'eleventh'))),
  0::bigint, 'the eleventh help in a Malaysia month grants nothing'
);

insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000b8', 'cash');
insert into ids values
  ('settle1', public.open_payment('bounty', gen_random_uuid(), '帮取快递', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b8', 1000)),
  ('settle2', public.open_payment('bounty', gen_random_uuid(), '帮带咖啡', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b8', 500));
insert into counts values ('b8_before', pg_temp.coins_of('00000000-0000-0000-0000-0000000000b8'));
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b8');
select public.confirm_payment_received((select id from ids where name = 'settle1'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000b8')::bigint, (select n + 2 from counts where name = 'b8_before'),
  'the first bounty settled through the settle grants the payee two coins'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b8');
select public.confirm_payment_received((select id from ids where name = 'settle2'));
select is(
  pg_temp.coins_of('00000000-0000-0000-0000-0000000000b8')::bigint, (select n + 3 from counts where name = 'b8_before'),
  'a second bounty settled through the settle grants one more coin'
);
reset role;

insert into counts values ('backfill_ledger', (select count(*) from public.coin_ledger));
select is(private.backfill_coin_grants(), 0, 'the backfill writes nothing for users who have their grants');
select is(
  (select count(*) from public.coin_ledger), (select n from counts where name = 'backfill_ledger'),
  'a second backfill leaves the ledger unchanged'
);
alter table public.payee_methods disable trigger payee_methods_onboarding_grant;
insert into public.payee_methods (user_id, type) values ('00000000-0000-0000-0000-0000000000f6', 'cash');
alter table public.payee_methods enable trigger payee_methods_onboarding_grant;
select is(private.backfill_coin_grants(), 1, 'the backfill grants a payee method that has no grant yet');
select is(
  (select count(*) from public.coin_ledger
   where user_id = '00000000-0000-0000-0000-0000000000f6' and reason = 'onboarding_payee_method'),
  1::bigint, 'the backfilled payee-method grant is one row'
);
select is(
  has_function_privilege('authenticated', 'private.grant_help_settled(uuid)', 'execute'), false,
  'a client cannot grant a help coin'
);

select * from finish();
rollback;

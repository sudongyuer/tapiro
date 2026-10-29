begin;
select plan(31);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@example.com', '{"full_name":"Emma"}'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@example.com', '{"full_name":"Farid"}');

insert into public.payee_methods (user_id, type)
select id, 'cash' from auth.users
where id in (
  '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d4',
  '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000f6'
);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty(poster uuid, helper uuid, state public.bounty_status, address text default null)
returns uuid language plpgsql as $$
declare
  item uuid := gen_random_uuid();
begin
  perform pg_temp.act_as(poster);
  perform public.publish_bounty(
    item, '帮取快递', 'pickup', 500, 'MYR',
    place_label => 'Sunway', latitude => 3.07, longitude => 101.6, address => address
  );
  if helper is not null then
    perform pg_temp.act_as(helper);
    perform public.apply_to_bounty(item);
  end if;
  perform pg_temp.act_as(poster);
  if state = 'closed' then
    perform public.close_bounty(item);
  elsif state <> 'open' then
    perform public.select_helper(item, helper);
  end if;
  if state = 'cancelled' then
    perform public.cancel_bounty(item);
  elsif state in ('en_route', 'done', 'disputed', 'confirmed') then
    perform pg_temp.act_as(helper);
    perform public.start_bounty(item);
    if state <> 'en_route' then
      perform public.complete_bounty(item);
      perform pg_temp.act_as(poster);
      if state = 'disputed' then
        perform public.report_bounty_problem(item, '没看到东西');
      elsif state = 'confirmed' then
        perform public.confirm_bounty(item);
      end if;
    end if;
  end if;
  return item;
end;
$$;

create temp table fx (name text primary key, id uuid not null);

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.active(uid uuid) returns text[] language sql as $$
  select coalesce(array_agg(concat_ws(' ', f.name, a.role, a.counterpart_id, a.status, a.reward_minor, a.reward_currency, a.title)
    order by f.name), '{}')
  from public.active_bounties_of(uid) a join fx f on f.id = a.id;
$$;

insert into fx
select s::text, pg_temp.bounty(
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', s::public.bounty_status
)
from unnest(array['open', 'assigned', 'confirmed', 'closed', 'cancelled']) s;
insert into fx values
  ('en_route', pg_temp.bounty('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e5', 'en_route')),
  ('done', pg_temp.bounty('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e5', 'done')),
  ('disputed', pg_temp.bounty('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e5', 'disputed')),
  ('settled', pg_temp.bounty('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d4', 'confirmed', '3 楼前台'));
reset role;

select is(
  (select array_agg(status::text order by name) from fx join public.bounties b using (id)),
  array['assigned', 'cancelled', 'closed', 'confirmed', 'disputed', 'done', 'en_route', 'open', 'confirmed'],
  'the fixtures reach every status through the RPCs'
);

select is(
  pg_temp.active('00000000-0000-0000-0000-0000000000a1'),
  array['assigned poster 00000000-0000-0000-0000-0000000000b2 assigned 500 MYR 帮取快递'],
  'the poster''s active list holds only the assigned bounty, with the helper as counterpart'
);

select is(
  pg_temp.active('00000000-0000-0000-0000-0000000000b2'),
  array['assigned helper 00000000-0000-0000-0000-0000000000a1 assigned 500 MYR 帮取快递'],
  'the helper''s active list holds only the assigned bounty, with the poster as counterpart'
);

select is(
  pg_temp.active('00000000-0000-0000-0000-0000000000e5'),
  array[
    'disputed helper 00000000-0000-0000-0000-0000000000c3 disputed 500 MYR 帮取快递',
    'done helper 00000000-0000-0000-0000-0000000000c3 done 500 MYR 帮取快递',
    'en_route helper 00000000-0000-0000-0000-0000000000c3 en_route 500 MYR 帮取快递'
  ],
  'en_route, done and disputed are active; the confirmed bounty E posted is not'
);

select is(
  pg_temp.active('00000000-0000-0000-0000-0000000000d4'),
  '{}'::text[],
  'a helper whose only bounty is confirmed has nothing active'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$select * from public.active_bounties_of('00000000-0000-0000-0000-0000000000a1')$$,
  '42501',
  null,
  'authenticated cannot execute active_bounties_of'
);
reset role;

select throws_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '55000',
  'active_bounties',
  'deleting a poster with an assigned bounty is refused'
);

select throws_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000b2'$$,
  '55000',
  'active_bounties',
  'deleting the helper of an assigned bounty is refused'
);

select is(
  (select array[status::text, poster_id::text, helper_id::text] from public.bounties where id = pg_temp.fx('open')),
  array['open', '00000000-0000-0000-0000-0000000000a1', null],
  'a refused deletion closes nothing'
);

select is(
  (select count(*) from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2'
  )),
  2::bigint,
  'both refused accounts still exist'
);

update public.payments set state = 'settled', settled_at = now(), method_type = 'cash'
where item_kind = 'bounty' and item_id = pg_temp.fx('settled');

create temp table before_d as
select
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('settled')) as events,
  (select count(*) from public.bounty_addresses where bounty_id = pg_temp.fx('settled')) as addresses;

delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';

select is(
  (select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000d4'),
  0::bigint,
  'the helper of a settled bounty can delete their account'
);

select is(
  (select array[status::text, poster_id::text, helper_id::text] from public.bounties where id = pg_temp.fx('settled')),
  array['confirmed', '00000000-0000-0000-0000-0000000000e5', null],
  'the settled bounty stays confirmed with the poster and no helper'
);

select is(
  (select count(*) from public.bounty_events where bounty_id = pg_temp.fx('settled')),
  (select events from before_d),
  'the poster keeps every event of the settled bounty'
);

select is(
  (select count(*) from public.bounty_addresses where bounty_id = pg_temp.fx('settled')),
  (select addresses from before_d),
  'the poster keeps the address of the settled bounty'
);

select is(
  (select array[state::text, payer_id::text, coalesce(payee_id::text, '-')] from public.payments
   where item_kind = 'bounty' and item_id = pg_temp.fx('settled')),
  array['settled', '00000000-0000-0000-0000-0000000000e5', '-'],
  'the poster keeps the settled payment, without the deleted payee'
);

insert into public.coin_ledger (user_id, reason, delta)
values ('00000000-0000-0000-0000-0000000000f6', 'help_settled', 1);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f6');
select public.spend_post('00000000-0000-0000-0000-0000000000f6', 'ride', gen_random_uuid())
from generate_series(1, 3);
insert into fx values
  ('f-open', pg_temp.bounty('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000e5', 'open', '宿舍 B 栋')),
  ('f-closed', pg_temp.bounty('00000000-0000-0000-0000-0000000000f6', null, 'closed', '图书馆')),
  ('e-open', pg_temp.bounty('00000000-0000-0000-0000-0000000000e5', null, 'open'));
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select public.apply_to_bounty(pg_temp.fx('e-open'));
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f6');
select public.apply_to_bounty(pg_temp.fx('e-open'), '我在楼下');
reset role;

select is(
  (select array[charge::text, coalesce(refunded_at::text, '-')] from public.post_charges
   where item_kind = 'bounty' and item_id = pg_temp.fx('f-open')),
  array['coin', '-'],
  'F''s open bounty was paid with a coin and is not refunded yet'
);

select is(
  (select count(*) from public.bounty_addresses where bounty_id in (pg_temp.fx('f-open'), pg_temp.fx('f-closed'))),
  2::bigint,
  'F''s bounties have address rows before the deletion'
);

select is(
  (select count(*) from public.bounty_applications where bounty_id = pg_temp.fx('e-open') and status = 'pending'),
  2::bigint,
  'E''s open bounty has two pending applications before F leaves'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000000f6';

select is(
  (select array[status::text, coalesce(poster_id::text, '-')] from public.bounties where id = pg_temp.fx('f-open')),
  array['closed', '-'],
  'deleting a poster closes their open bounty and clears the poster'
);

select is(
  (select array_agg(concat_ws(' ', kind, from_status, to_status, coalesce(actor_id::text, '-')) order by id)
   from public.bounty_events where bounty_id = pg_temp.fx('f-open') and kind = 'closed'),
  array['closed open closed -'],
  'the deletion writes one closed event'
);

select is(
  (select count(*) from public.bounty_addresses where bounty_id in (pg_temp.fx('f-open'), pg_temp.fx('f-closed'))),
  0::bigint,
  'the deleted poster''s address rows are gone'
);

select isnt(
  (select refunded_at from public.post_charges where item_kind = 'bounty' and item_id = pg_temp.fx('f-open')),
  null,
  'the open bounty''s charge is refunded'
);

select is(
  (select array_agg(coalesce(user_id::text, '-') order by id) from public.coin_ledger
   where item_kind = 'bounty' and item_id = pg_temp.fx('f-open') and reason = 'post_refund'),
  array['-'],
  'the refund coin stays in the ledger with no user'
);

select is(
  (select coalesce(user_id::text, '-') from public.coin_ledger
   where item_kind = 'bounty' and item_id = pg_temp.fx('f-open') and reason = 'post_spend'),
  '-',
  'the spend stays in the ledger with no user'
);

select is(
  (select status::text from public.bounties where id = pg_temp.fx('f-closed')),
  'closed',
  'an already closed bounty is left as it was'
);

select is(
  (select array_agg(status::text) from public.bounty_applications where bounty_id = pg_temp.fx('f-open')),
  array['pending'],
  'another user''s application to the closed bounty stays pending'
);

select is(
  (select count(*) from public.bounty_applications where applicant_id = '00000000-0000-0000-0000-0000000000f6'),
  0::bigint,
  'the deleted applicant''s application is gone'
);

select is(
  (select array_agg(applicant_id::text) from public.bounty_applications
   where bounty_id = pg_temp.fx('e-open') and status = 'pending'),
  array['00000000-0000-0000-0000-0000000000c3'],
  'the poster''s pending applicants drop to the one who stayed'
);

select is(
  (select status::text from public.bounties where id = pg_temp.fx('e-open')),
  'open',
  'a bounty the deleted user applied to stays open'
);

select is(
  pg_temp.active('00000000-0000-0000-0000-0000000000a1'),
  array['assigned poster 00000000-0000-0000-0000-0000000000b2 assigned 500 MYR 帮取快递'],
  'other users'' active bounties are untouched'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.cancel_bounty(pg_temp.fx('assigned'));
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';

select is(
  (select array_agg(concat_ws(' ', name, b.status, coalesce(b.poster_id::text, '-')) order by name)
   from fx join public.bounties b using (id) where name in ('open', 'assigned', 'confirmed', 'cancelled')),
  array['assigned cancelled -', 'cancelled cancelled -', 'confirmed confirmed -', 'open closed -'],
  'once nothing is active the poster can leave; the open bounty closes and the rest keep their status'
);

select * from finish();
rollback;

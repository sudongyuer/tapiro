begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.listed_item(k text, kind text) returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select i -> 'item' from jsonb_array_elements(public.list_threads() -> 'items') i where i ->> 'kind' = kind;
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 2);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty(
  'b0000000-0000-4000-8000-000000000003', '帮我买杯奶茶', 'buy', 500, 'MYR', art => 'tea'
);
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000003', '我可以');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000003', pg_temp.u('b2'));

select is(
  pg_temp.listed_item('b2', 'bounty'),
  '{"title": "帮我买杯奶茶", "category": "buy", "art": "tea", "status": "assigned"}'::jsonb,
  'a bounty row carries the bounty title, category, art and status'
);

select pg_temp.act_as(pg_temp.u('a1'));
select is(
  public.read_thread((select t.id from public.threads t where t.bounty_id = 'b0000000-0000-4000-8000-000000000003'))
    #> '{thread,item}',
  pg_temp.listed_item('a1', 'bounty'),
  'read_thread carries the same item as the list row'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('b0000000-0000-4000-8000-000000000004', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('c3'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000004', '我可以');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000004', pg_temp.u('c3'));
select is(
  pg_temp.listed_item('c3', 'bounty') -> 'art', 'null'::jsonb,
  'a bounty without chosen art has a null art, so the client picks it from the title and category'
);

select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  'a2000000-0000-4000-8000-000000000009', 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
  now() + interval '3 hours', 6, 'MYR'
);
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride('a2000000-0000-4000-8000-000000000009');
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-000000000009', pg_temp.u('c3'), true);

select is(
  pg_temp.listed_item('c3', 'ride') - 'departsAt',
  '{"from": "双威", "to": "KLIA2", "status": "open"}'::jsonb,
  'a ride row carries the short route and the ride status'
);
select is(
  (pg_temp.listed_item('c3', 'ride') ->> 'departsAt')::timestamptz,
  (select private.ride_departs_at(r) from public.rides r where r.id = 'a2000000-0000-4000-8000-000000000009'),
  'a ride row carries the departure time'
);

update public.rides set status = 'gathering' where id = 'a2000000-0000-4000-8000-000000000009';
select is(
  pg_temp.listed_item('a1', 'ride') ->> 'status', 'gathering', 'the item status follows the ride'
);

select pg_temp.act_as(pg_temp.u('b2'));
select is(
  (select count(*) from jsonb_array_elements(public.list_threads() -> 'items') i where i -> 'item' = 'null'::jsonb),
  0::bigint,
  'every listed thread has its item'
);

select * from finish();
rollback;

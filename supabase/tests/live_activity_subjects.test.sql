begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3', 'd4']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.u(k)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('41000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('42000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.subjects(k text) returns jsonb language plpgsql as $$
begin
  perform pg_temp.act_as(k);
  return public.live_activity_subjects();
end;
$$;

create function pg_temp.subject(k text, id uuid) returns jsonb language sql as $$
  select x from jsonb_array_elements(pg_temp.subjects(k)) x where x ->> 'id' = id::text;
$$;

create function pg_temp.en_route(n integer) returns void language plpgsql as $$
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
  perform pg_temp.act_as('a1');
  perform public.publish_bounty(
    pg_temp.b(n), '帮取快递', 'pickup', 500, 'MYR', null, 'KL Sentral', 3.1340, 101.6860, 'Block C, 3-2'
  );
  perform pg_temp.act_as('b2');
  perform public.apply_to_bounty(pg_temp.b(n));
  perform pg_temp.act_as('a1');
  perform public.select_helper(pg_temp.b(n), pg_temp.u('b2'));
  perform pg_temp.act_as('b2');
  perform public.start_bounty(pg_temp.b(n), now() + interval '6 minutes');
end;
$$;

select pg_temp.en_route(1);

select is(pg_temp.subject('a1', pg_temp.b(1)) ->> 'phase', 'onTheWay', 'the poster gets a helper on the way');
select is(
  pg_temp.subject('a1', pg_temp.b(1)) ->> 'helper',
  (select display_name from public.profiles where id = pg_temp.u('b2')),
  'with the helper''s display name (274 A)'
);
select is(pg_temp.subject('a1', pg_temp.b(1)) ->> 'place', 'KL Sentral', 'and the place''s short name');
select ok(pg_temp.subjects('a1')::text not like '%Block C%', 'never the exact address');
select is(
  (pg_temp.subject('a1', pg_temp.b(1)) ->> 'etaAt')::timestamptz, now() + interval '6 minutes', 'with the ETA'
);
select is(
  (pg_temp.subject('a1', pg_temp.b(1)) ->> 'leftAt')::timestamptz, now(), 'and the time the helper set off'
);
select is(pg_temp.subject('b2', pg_temp.b(1)), null, 'the helper gets none: the person waiting does');

select pg_temp.act_as('b2');
select public.update_eta(pg_temp.b(1), now() + interval '9 minutes');
select is(
  (pg_temp.subject('a1', pg_temp.b(1)) ->> 'etaAt')::timestamptz, now() + interval '9 minutes',
  'a changed ETA is read'
);

select pg_temp.act_as('b2');
select public.complete_bounty(pg_temp.b(1));
select is(pg_temp.subject('a1', pg_temp.b(1)) ->> 'phase', 'arrived', '完成 is the final step');
select is(
  (pg_temp.subject('a1', pg_temp.b(1)) ->> 'arrivedAt')::timestamptz, now(), 'with the time it was done'
);

update public.bounties set done_at = now() - interval '16 minutes' where id = pg_temp.b(1);
select is(pg_temp.subject('a1', pg_temp.b(1)), null, 'the final step is gone after its 15 minutes (277 A)');

select pg_temp.en_route(2);
select pg_temp.act_as('a1');
select public.cancel_bounty(pg_temp.b(2));
select is(pg_temp.subject('a1', pg_temp.b(2)), null, 'a cancelled bounty has none');

select pg_temp.act_as('a1');
select public.publish_ride(
  pg_temp.r(1), 'Sunway Geo Residences', '双威', 3.07331, 101.60782, 'KLIA2', 'KLIA2', 2.7456, 101.6865,
  now() + interval '20 minutes', 3, 'MYR'
);
select pg_temp.act_as('b2');
select public.request_ride(pg_temp.r(1));
select pg_temp.act_as('c3');
select public.request_ride(pg_temp.r(1));
select pg_temp.act_as('d4');
select public.request_ride(pg_temp.r(1));
select pg_temp.act_as('a1');
select public.decide_ride_request(pg_temp.r(1), pg_temp.u('b2'), true);
select public.decide_ride_request(pg_temp.r(1), pg_temp.u('d4'), true);

select is(pg_temp.subject('b2', pg_temp.r(1)) ->> 'phase', 'meetup', 'a member gets the ride at 集合');
select is(
  (pg_temp.subject('b2', pg_temp.r(1)) ->> 'startHome')::boolean, true, 'a start of kind home is flagged (274 A)'
);
select is(
  pg_temp.subject('a1', pg_temp.r(1)) -> 'total', '3'::jsonb, 'the organiser too, counting everyone accepted'
);
select is(pg_temp.subject('c3', pg_temp.r(1)), null, 'an applicant gets none');

select pg_temp.act_as('b2');
select public.mark_ride_arrived(pg_temp.r(1));
select is(pg_temp.subject('a1', pg_temp.r(1)) -> 'arrived', '1'::jsonb, '我到了 is counted');

select pg_temp.act_as('a1');
select public.depart_ride(pg_temp.r(1), array[pg_temp.u('b2')]);
select is(pg_temp.subject('b2', pg_temp.r(1)) ->> 'phase', 'departed', '出发 is the final step');
select is(pg_temp.subject('b2', pg_temp.r(1)) -> 'aboard', '2'::jsonb, 'with everyone aboard');

select is(pg_temp.subject('d4', pg_temp.r(1)), null, 'someone left behind at 出发 gets no final step');

update public.ride_events set created_at = now() - interval '16 minutes'
where ride_id = pg_temp.r(1) and kind = 'departed';
select is(pg_temp.subject('b2', pg_temp.r(1)), null, 'the departure is gone after its 15 minutes (277 A)');

select pg_temp.act_as('a1');
select public.publish_ride(
  pg_temp.r(2), 'Sunway Pyramid', '金字塔', 3.0731, 101.6070, 'KLIA2', 'KLIA2', 2.7456, 101.6865,
  now() + interval '60 minutes', 3, 'MYR'
);
select pg_temp.act_as('b2');
select public.request_ride(pg_temp.r(2));
select pg_temp.act_as('a1');
select public.decide_ride_request(pg_temp.r(2), pg_temp.u('b2'), true);
select is(pg_temp.subject('b2', pg_temp.r(2)), null, 'a ride before its 集合 (T-30) has none');

select pg_temp.en_route(3);
select isnt(pg_temp.subject('a1', pg_temp.b(3)), null, 'a third bounty on the way is listed');
insert into public.blocks (blocker_id, blocked_id) values (pg_temp.u('a1'), pg_temp.u('b2'));
select is(pg_temp.subject('a1', pg_temp.b(3)), null, 'and is gone once either side blocks the other');

select * from finish();
rollback;

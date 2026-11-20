begin;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('d4', 'Devi')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['b2', 'd4']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.b(n integer) returns uuid language sql as $$
  select ('46000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.r(n integer) returns uuid language sql as $$
  select ('47000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.at_0235(k text, kind text, subject uuid) returns text language plpgsql as $$
declare
  answer text;
begin
  insert into public.events (recipient, kind, subject_id, push, created_at)
  values (pg_temp.u(k), kind, subject, true, '2099-01-01 18:35+00');
  select case when q.quiet and q.send_at = '2099-01-02 00:00+00' then 'held until 08:00'
    when not q.quiet and q.send_at = '2099-01-01 18:35+00' then 'sent now'
    else 'other' end
  into answer
  from public.push_queue q
  where q.recipient = pg_temp.u(k) and q.kind = at_0235.kind and q.subject_id = subject and q.send_at > '2090-01-01'
  order by q.id desc limit 1;
  return answer;
end;
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty(pg_temp.b(1), '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty(pg_temp.b(1));
select pg_temp.act_as(pg_temp.u('d4'));
select public.apply_to_bounty(pg_temp.b(1));
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper(pg_temp.b(1), pg_temp.u('b2'));

select is(
  pg_temp.at_0235('a1', 'bounty.applied', pg_temp.b(1)), 'held until 08:00',
  'at 02:35 Malaysia time an ordinary push (someone applied) waits for 08:00'
);
select is(
  pg_temp.at_0235('b2', 'payment.marked_paid', gen_random_uuid()), 'sent now',
  'at 02:35 the payee hears at once that the other side says they paid'
);
select is(
  pg_temp.at_0235('b2', 'payment.not_received', gen_random_uuid()), 'sent now',
  'and the payer hears at once that the payee has not received it'
);
select is(
  pg_temp.at_0235('b2', 'bounty.selected', pg_temp.b(1)), 'sent now', 'a helper hears at once that they were chosen'
);
select is(
  pg_temp.at_0235('b2', 'bounty.cancelled', pg_temp.b(1)), 'sent now',
  'the chosen helper hears at once that the bounty was cancelled before setting off'
);
select is(
  pg_temp.at_0235('d4', 'bounty.cancelled', pg_temp.b(1)), 'held until 08:00',
  'someone who only applied hears of a cancel at 08:00'
);
select is(
  pg_temp.at_0235('b2', 'ride.cancelled', pg_temp.r(1)), 'sent now', 'a cancelled ride is told at once'
);
select is(
  (select array_agg(pg_temp.at_0235('b2', k, pg_temp.r(1)) order by k)
   from unnest(array['ride.approved', 'ride.declined', 'ride.time_revised']) k),
  array['sent now', 'sent now', 'sent now'], 'a seat decided or a departure time moved is told at once'
);
select is(
  pg_temp.at_0235('a1', 'ride.split_sent', pg_temp.r(1)), 'held until 08:00', 'a split to pay waits for 08:00'
);

insert into public.rides (id, organiser_id, start_point, start_label, start_short, dest_point, dest_label, dest_short,
  depart_at, currency)
select pg_temp.r(n), pg_temp.u('a1'), 'SRID=4326;POINT(101.6078 3.0733)', 'Sunway Geo', '双威',
  'SRID=4326;POINT(101.7113 2.7456)', 'KLIA2', 'KLIA2', d, 'MYR'
from (values (2, '2099-01-02 01:30+00'::timestamptz), (3, '2099-01-02 04:00+00'::timestamptz)) v (n, d);
select is(
  pg_temp.at_0235('a1', 'ride.requested', pg_temp.r(2)), 'sent now',
  'a join request for a ride leaving at 09:30 reaches the organiser at once'
);
select is(
  pg_temp.at_0235('a1', 'ride.requested', pg_temp.r(3)), 'held until 08:00',
  'a join request for a ride leaving at noon waits for 08:00'
);
select is(
  pg_temp.at_0235('a1', 'chat.message', gen_random_uuid()), 'held until 08:00', 'a chat message waits for 08:00'
);

select * from finish();
rollback;

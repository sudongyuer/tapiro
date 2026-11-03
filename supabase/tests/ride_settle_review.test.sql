begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen')) v (k, n);

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
  select ('42000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.as_user(k text, statement text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(pg_temp.u(k));
  execute 'select to_jsonb((' || statement || '))' into answer;
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

create function pg_temp.payment_of(n integer, k text) returns uuid language sql security definer as $$
  select payment_id from public.ride_members where ride_id = pg_temp.r(n) and member_id = pg_temp.u(k);
$$;

create function pg_temp.stickers(n integer) returns uuid[] language sql security definer as $$
  select coalesce(array_agg(owner_id order by owner_id), '{}') from public.stickers where item_kind = 'ride' and item_id = pg_temp.r(n);
$$;

select pg_temp.departed(1, 'tapiro', array['b2', 'c3'], array['b2', 'c3']);
select pg_temp.act_as(pg_temp.u('a1'));
select public.reach_ride(pg_temp.r(1));
select public.send_ride_split(pg_temp.r(1), 7400, jsonb_build_array(
  jsonb_build_object('memberId', pg_temp.u('b2'), 'minor', 2470), jsonb_build_object('memberId', pg_temp.u('c3'), 'minor', 2470)
));

set local role authenticated;

select pg_temp.as_user('a1', format('public.change_ride_share(%L, %L, 2000)', pg_temp.r(1), pg_temp.u('b2')));
select throws_ok(
  format($$select pg_temp.as_user('b2', %L)$$,
    format('public.mark_payment_paid(%L, %L, 2470)', pg_temp.payment_of(1, 'b2'), '00000000-0000-4000-8000-0000000000a9')),
  '55000', 'amount_changed', 'a share changed while the pay sheet was open is refused'
);
select throws_ok(
  format($$select pg_temp.as_user('b2', %L)$$,
    format('public.mark_payment_paid(%L, %L, null)', pg_temp.payment_of(1, 'b2'), '00000000-0000-4000-8000-0000000000a9')),
  '55000', 'amount_changed', 'a payer who names no amount is refused'
);
select is(
  pg_temp.as_user('b2', format('public.mark_payment_paid(%L, %L, 2000)', pg_temp.payment_of(1, 'b2'), '00000000-0000-4000-8000-0000000000a9')),
  '"marked_paid"'::jsonb, 'the amount the payer saw is marked paid'
);
reset role;
select is((select state::text from public.payments where id = pg_temp.payment_of(1, 'b2')), 'marked_paid', 'the payment is marked paid at 2000');
set local role authenticated;
select hasnt_function('public', 'mark_payment_paid', array['uuid', 'uuid', 'text'], 'the call without an amount is gone');

select * from finish();
rollback;

begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi')) v (k, n);

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.open(name text, kind public.payment_item_kind, payer text, payee text, hours integer)
returns void language plpgsql as $$
declare
  opened uuid := public.open_payment(kind, gen_random_uuid(), '帮取快递', pg_temp.u(payer), pg_temp.u(payee), 500, 'MYR');
begin
  update public.payments set created_at = now() - make_interval(hours => hours) where id = opened;
  insert into ids values (name, opened);
end;
$$;

create function pg_temp.p(name text) returns uuid language sql as $$
  select id from ids where ids.name = p.name;
$$;

create function pg_temp.reminders(name text) returns bigint language sql as $$
  select count(*) from public.events e where e.kind = 'payment.reminder' and e.subject_id = pg_temp.p(name);
$$;

select pg_temp.open('fresh', 'bounty', 'a1', 'b2', 23);
select pg_temp.open('day', 'bounty', 'a1', 'b2', 25);
select pg_temp.open('late', 'bounty', 'a1', 'b2', 80);
select pg_temp.open('ride', 'ride', 'a1', 'b2', 30);
select pg_temp.open('marked', 'bounty', 'a1', 'b2', 30);
select pg_temp.open('settled', 'bounty', 'a1', 'b2', 30);
update public.payments set state = 'marked_paid', marked_paid_at = now(), method_type = 'cash', nudged_at = now()
where id = pg_temp.p('marked');
update public.payments set state = 'settled', settled_at = now() where id = pg_temp.p('settled');

select ok(
  (select push from private.event_kinds where kind = 'payment.reminder'), 'an unpaid reminder is a push kind'
);

create temp table runs (name text primary key, r jsonb);
insert into runs select 'first', private.run_payment_reminders(now());
insert into runs select 'again', private.run_payment_reminders(now());

select is((select r from runs where name = 'first'), '{"reminded": 2, "skipped": 0}'::jsonb, 'the first run reminds two');
select is((select r from runs where name = 'again'), '{"reminded": 0, "skipped": 0}'::jsonb, 'a run right after sends nothing');
select is(pg_temp.reminders('fresh'), 0::bigint, 'a payment due 23 hours is not reminded yet');
select is(pg_temp.reminders('day'), 1::bigint, 'a payment due 25 hours is reminded once');
select is(pg_temp.reminders('late'), 1::bigint, 'a payment due 80 hours with no reminder yet gets one, not two');
select is(
  (select hours from private.payment_reminders where payment_id = pg_temp.p('late')), 72::smallint,
  'and it is the 72 hour reminder'
);
select is(pg_temp.reminders('ride'), 0::bigint, 'a ride payment is reminded on the device, not by push');
select is(pg_temp.reminders('marked'), 0::bigint, 'a payment marked paid is not reminded');
select is(pg_temp.reminders('settled'), 0::bigint, 'a settled payment is not reminded');
select is(
  (select array_agg(row(e.recipient, e.actor_id, e.push)::text) from public.events e
   where e.kind = 'payment.reminder' and e.subject_id = pg_temp.p('day')),
  array[row(pg_temp.u('a1'), pg_temp.u('b2'), true)::text],
  'the reminder reaches the payer and names the payee'
);
select is(
  (select q.thread_id from public.push_queue q where q.kind = 'payment.reminder' and q.subject_id = pg_temp.p('day')),
  (select 'bounty:' || item_id from public.payments where id = pg_temp.p('day')),
  'it is queued as a push grouped with its bounty'
);

insert into runs select 'later', private.run_payment_reminders(now() + interval '48 hours');
select is((select r ->> 'reminded' from runs where name = 'later'), '2', 'two days later two more go out');
select is(pg_temp.reminders('day'), 2::bigint, 'the 25 hour payment gets its 72 hour reminder');
select is(pg_temp.reminders('fresh'), 1::bigint, 'the 23 hour payment gets its 24 hour reminder');
select is(pg_temp.reminders('late'), 1::bigint, 'a payment reminded at 72 hours is never reminded again');

insert into runs select 'month', private.run_payment_reminders(now() + interval '30 days');
select is(pg_temp.reminders('day'), 2::bigint, 'two reminders at most');

select pg_temp.open('old', 'bounty', 'c3', 'd4', 24 * 8);
set local role authenticated;
select pg_temp.act_as(pg_temp.u('c3'));
select is(public.publish_blocked(), true, 'a payment owed 8 days blocks publishing');
reset role;
update public.payments set state = 'disputed' where id = pg_temp.p('old');
set local role authenticated;
select is(public.publish_blocked(), false, 'a payment whose report was resolved no longer blocks');
reset role;

select is(
  (select schedule from cron.job where jobname = 'payment-reminders'), '*/10 * * * *',
  'reminders run every 10 minutes'
);
select ok(
  not has_function_privilege('authenticated', 'public.run_payment_reminders()', 'execute'),
  'clients cannot run the reminders'
);
select ok(
  not has_function_privilege('anon', 'public.run_payment_reminders()', 'execute'), 'anon cannot run the reminders'
);
select ok(
  has_function_privilege('service_role', 'public.run_payment_reminders()', 'execute'),
  'the service role runs the reminders'
);
select ok(
  not has_function_privilege('service_role', 'private.run_payment_reminders(timestamptz)', 'execute'),
  'no role picks a run time'
);

select * from finish();
rollback;

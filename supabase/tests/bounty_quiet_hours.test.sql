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
  select ('45000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.assigned(n integer) returns void language plpgsql as $$
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_bounty(pg_temp.b(n), '帮取快递', 'pickup', 500, 'MYR');
  perform pg_temp.act_as(pg_temp.u('b2'));
  perform public.apply_to_bounty(pg_temp.b(n));
  perform pg_temp.act_as(pg_temp.u('d4'));
  perform public.apply_to_bounty(pg_temp.b(n));
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.select_helper(pg_temp.b(n), pg_temp.u('b2'));
end;
$$;

create function pg_temp.started(n integer) returns void language plpgsql as $$
begin
  perform pg_temp.assigned(n);
  perform pg_temp.act_as(pg_temp.u('b2'));
  perform public.start_bounty(pg_temp.b(n), now() + interval '20 minutes');
end;
$$;

create function pg_temp.held(k text, kind text, subject uuid) returns text language plpgsql as $$
declare
  answer text;
begin
  insert into public.events (recipient, kind, subject_id, push, created_at)
  values (pg_temp.u(k), kind, subject, true, '2099-01-01 17:00+00');
  select case when q.quiet and q.send_at = '2099-01-02 00:00+00' then 'held'
    when not q.quiet and q.send_at = '2099-01-01 17:00+00' then 'sent'
    else 'other' end
  into answer
  from public.push_queue q
  where q.recipient = pg_temp.u(k) and q.kind = held.kind and q.subject_id = subject and q.send_at > '2090-01-01'
  order by q.id desc limit 1;
  return answer;
end;
$$;

create function pg_temp.thread_of(n integer) returns uuid language sql as $$
  select t.id from public.threads t where t.bounty_id = pg_temp.b(n);
$$;

select pg_temp.assigned(1);
select is(
  pg_temp.held('a1', 'bounty.applied', pg_temp.b(1)), 'held',
  'at 01:00 Malaysia time a push about an assigned bounty that has not set off waits for 08:00'
);
select is(
  pg_temp.held('a1', 'chat.message', pg_temp.thread_of(1)), 'held', 'and so does a message in its thread'
);

select pg_temp.started(2);
select is(
  pg_temp.held('a1', 'bounty.eta_changed', pg_temp.b(2)), 'sent',
  'the poster of a bounty on its way gets its push at once'
);
select is(
  pg_temp.held('b2', 'chat.message', pg_temp.thread_of(2)), 'sent',
  'a message in the thread of a bounty on its way is not held'
);
select is(
  pg_temp.held('d4', 'bounty.not_selected', pg_temp.b(2)), 'held',
  'an applicant who was not chosen is not on the bounty, so quiet hours apply'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.complete_bounty(pg_temp.b(2));
select is(
  pg_temp.held('a1', 'bounty.completed', pg_temp.b(2)), 'sent', 'a done bounty is still the one you are on'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.report_bounty_problem(pg_temp.b(2), '没看到东西');
select is(
  pg_temp.held('b2', 'bounty.issue', pg_temp.b(2)), 'sent',
  'a problem reported on a done bounty reaches the helper at once'
);
select is(
  pg_temp.held('a1', 'chat.message', pg_temp.thread_of(2)), 'held',
  'while the problem is open the thread follows quiet hours, since a dispute can last for days'
);

select pg_temp.started(3);
select pg_temp.act_as(pg_temp.u('a1'));
select public.cancel_bounty(pg_temp.b(3));
select is(
  pg_temp.held('b2', 'bounty.cancelled', pg_temp.b(3)), 'sent',
  'a cancel while the helper is on the way reaches them at once'
);
select is(
  pg_temp.held('b2', 'chat.message', pg_temp.thread_of(3)), 'held',
  'after that cancel the thread follows quiet hours again'
);

select pg_temp.assigned(4);
select pg_temp.act_as(pg_temp.u('a1'));
select public.cancel_bounty(pg_temp.b(4));
select is(
  pg_temp.held('b2', 'bounty.cancelled', pg_temp.b(4)), 'held', 'a cancel before setting off waits for 08:00'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.complete_bounty(pg_temp.b(2));
select pg_temp.act_as(pg_temp.u('a1'));
select public.confirm_bounty(pg_temp.b(2));
select is(
  pg_temp.held('b2', 'chat.message', pg_temp.thread_of(2)), 'held',
  'once the bounty is confirmed its thread follows quiet hours again'
);

select * from finish();
rollback;

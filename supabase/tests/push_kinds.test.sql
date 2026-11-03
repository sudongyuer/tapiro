begin;
select plan(2);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'a1@example.com', '{"full_name":"Alice"}');

insert into public.events (recipient, kind, subject_id, push)
select '00000000-0000-0000-0000-0000000000a1', k.kind, gen_random_uuid(), true
from private.event_kinds k where k.push
order by k.kind;

select cmp_ok(
  (select count(*) from private.event_kinds k where k.push), '>', 15::bigint, 'there are push kinds to check'
);
select is(
  (select coalesce(array_agg(k.kind order by k.kind), '{}') from private.event_kinds k
   where k.push and not exists (
     select 1 from public.push_queue q where q.kind = k.kind and q.thread_id is not null
   )),
  '{}'::text[], 'every push kind has a thread rule and is queued'
);

select * from finish();
rollback;

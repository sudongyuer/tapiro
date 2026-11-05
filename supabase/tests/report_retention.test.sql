begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob')) v (k, n);

insert into public.reports (id, reporter_id, target_id, reason, note, message_body, message_sent_at, created_at)
values
  ('47000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000b2', 'harassment', '一直骚扰', '先转定金', now() - interval '13 months',
   now() - interval '1 year 1 minute'),
  ('47000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000a1', 'other', null, '加我微信', now() - interval '12 months',
   now() - interval '1 year' + interval '1 day'),
  ('47000000-0000-0000-0000-000000000003', null, null, 'off_platform_payment', null, '走微信转账更快',
   now() - interval '3 years', now() - interval '2 years');

select is(public.expire_report_snapshots(), 2, 'the run clears the snapshots of reports older than a year');
select is(
  (select array[r.message_body, r.message_sent_at::text] from public.reports r
   where r.id = '47000000-0000-0000-0000-000000000001'),
  array[null, null]::text[], 'the copied message and its time are gone'
);
select is(
  (select array[r.reason, r.note, r.reporter_id::text] from public.reports r
   where r.id = '47000000-0000-0000-0000-000000000001'),
  array['harassment', '一直骚扰', '00000000-0000-0000-0000-0000000000a1'], 'the report itself stays'
);
select is(
  (select r.message_body from public.reports r where r.id = '47000000-0000-0000-0000-000000000002'), '加我微信',
  'a report younger than a year keeps its snapshot'
);
select is(public.expire_report_snapshots(), 0, 'a second run finds nothing to clear');
select is(
  (select command from cron.job where jobname = 'report-snapshots-daily'), 'select public.expire_report_snapshots()',
  'the cleanup runs daily'
);

select * from finish();
rollback;

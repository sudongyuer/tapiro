begin;
select plan(7);

delete from vault.secrets where name in ('project_url', 'cron_secret', 'service_role_key');

select throws_ok(
  $$select public.call_edge_function('fx-rate')$$, 'TP001',
  'call_edge_function(fx-rate): Vault secret project_url is not set',
  'a scheduled call without project_url fails loudly instead of posting nothing'
);

select vault.create_secret('http://kong:8000', 'project_url');

select throws_ok(
  $$select public.call_edge_function('fx-rate')$$, 'TP001',
  'call_edge_function(fx-rate): Vault secret cron_secret is not set',
  'a scheduled call without cron_secret fails loudly'
);

select vault.create_secret('test-cron-secret', 'cron_secret');
select vault.create_secret('test-service-role', 'service_role_key');

select lives_ok($$select public.call_edge_function('fx-rate')$$, 'a scheduled call posts once both secrets exist');

create temp table sent as
select q.url, q.headers from net.http_request_queue q order by q.id desc limit 1;

select is((select url from sent), 'http://kong:8000/functions/v1/fx-rate', 'it posts to the function under project_url');
select is((select headers ->> 'x-cron-secret' from sent), 'test-cron-secret', 'it sends the cron secret in its header');
select ok(
  not exists (select 1 from sent where sent.headers::text like '%test-service-role%' or sent.headers ? 'Authorization'),
  'it sends no Authorization header and never the service role key'
);

select is(
  (select command from cron.job where jobname = 'push-stalled'), 'select private.mark_stalled_pushes()',
  'stalled pushes are marked by their own job, so a failing notify call cannot roll the marking back'
);

select * from finish();
rollback;

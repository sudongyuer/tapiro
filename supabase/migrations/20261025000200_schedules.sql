create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The Vault secrets `project_url` and `service_role_key` are set per environment at deploy time;
-- until they exist the jobs run and post nothing.
create function public.call_edge_function(name text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where vault.decrypted_secrets.name = 'project_url');
  key text := (select decrypted_secret from vault.decrypted_secrets where vault.decrypted_secrets.name = 'service_role_key');
begin
  if base is null or key is null then
    return;
  end if;
  perform net.http_post(
    url := base || '/functions/v1/' || name,
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.call_edge_function(text) from public, anon, authenticated;

-- BNM publishes the 17:00 session; 09:30 UTC is 17:30 Malaysia time.
select cron.schedule('fx-rate-daily', '30 9 * * *', $$select public.call_edge_function('fx-rate')$$);
select cron.schedule('payment-proof-cleanup-daily', '0 19 * * *', $$select public.call_edge_function('payment-proof-cleanup')$$);

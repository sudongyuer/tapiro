create or replace function public.call_edge_function(name text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'project_url');
  secret text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'cron_secret');
begin
  if coalesce(base, '') = '' or coalesce(secret, '') = '' then
    raise exception 'call_edge_function(%): Vault secret % is not set', call_edge_function.name,
      case when coalesce(base, '') = '' then 'project_url' else 'cron_secret' end
      using hint = 'See "Scheduled functions" in supabase/README.md.';
  end if;
  perform net.http_post(
    url := base || '/functions/v1/' || call_edge_function.name,
    headers := jsonb_build_object('x-cron-secret', secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.call_edge_function(text) from public, anon, authenticated;

create or replace function private.poke_notify() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from added where added.send_at <= now()) then
    -- A missing Vault secret must not roll back the write that queued the push; the five-minute drain raises it.
    begin
      perform public.call_edge_function('notify');
    exception when others then
      raise log '%', sqlerrm;
    end;
  end if;
  return null;
end;
$$;

revoke all on function private.poke_notify() from public, anon, authenticated;

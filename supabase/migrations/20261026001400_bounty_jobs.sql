create function public.run_bounty_jobs(as_of timestamptz default now()) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  expired integer := 0;
  confirmed integer := 0;
  reminded integer := 0;
  written integer;
begin
  for item in
    select id from public.bounties where status = 'open' and expires_at <= as_of
    order by expires_at for update skip locked
  loop
    begin
      perform private.close_bounty(item.id, 'expired');
      expired := expired + 1;
    exception when others then
      raise warning 'bounty % not expired: % %', item.id, sqlstate, sqlerrm;
    end;
  end loop;

  for item in
    select id from public.bounties where status = 'done' and done_at + interval '48 hours' <= as_of
    order by done_at for update skip locked
  loop
    begin
      perform private.confirm_bounty(item.id, null);
      confirmed := confirmed + 1;
    exception when others then
      raise warning 'bounty % not auto-confirmed: % %', item.id, sqlstate, sqlerrm;
    end;
  end loop;

  for item in
    select b.id from public.bounties b
    where b.status = 'assigned' and b.starts_at <= as_of
      and not exists (select 1 from public.bounty_events e where e.bounty_id = b.id and e.kind = 'start_reminder')
    order by b.starts_at for update skip locked
  loop
    begin
      insert into public.bounty_events (bounty_id, kind) values (item.id, 'start_reminder')
      on conflict (bounty_id) where kind = 'start_reminder' do nothing;
      get diagnostics written = row_count;
      reminded := reminded + written;
    exception when others then
      raise warning 'bounty % not reminded: % %', item.id, sqlstate, sqlerrm;
    end;
  end loop;

  return jsonb_build_object('expired', expired, 'autoConfirmed', confirmed, 'reminded', reminded);
end;
$$;

revoke all on function public.run_bounty_jobs(timestamptz) from public, anon, authenticated;
grant execute on function public.run_bounty_jobs(timestamptz) to service_role;

select cron.schedule('bounty-jobs', '*/5 * * * *', $$select public.run_bounty_jobs()$$);

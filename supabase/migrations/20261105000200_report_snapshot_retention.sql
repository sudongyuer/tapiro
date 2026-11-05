create function public.expire_report_snapshots() returns integer
language sql
security definer
set search_path = ''
as $$
  with cleared as (
    update public.reports r set message_body = null, message_sent_at = null
    where r.created_at < now() - interval '1 year'
      and (r.message_body is not null or r.message_sent_at is not null)
    returning 1
  )
  select count(*)::integer from cleared;
$$;

revoke all on function public.expire_report_snapshots() from public, anon, authenticated;

select cron.schedule('report-snapshots-daily', '15 19 * * *', $$select public.expire_report_snapshots()$$);

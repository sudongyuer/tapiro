insert into private.event_kinds (kind, push) values ('payment.reminder', true);

create table private.payment_reminders (
  payment_id uuid primary key references public.payments (id) on delete cascade,
  hours smallint not null check (hours in (24, 72)),
  sent_at timestamptz not null default now()
);

revoke all on private.payment_reminders from public, anon, authenticated, service_role;

-- Ride payments are reminded on the payer's device (ride.remind.pay, 173 A); a push as well would remind twice.
-- A run that missed the 24 h mark sends only the 72 h reminder.
create function private.run_payment_reminders(as_of timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  reminded integer := 0;
  skipped integer := 0;
begin
  for item in
    select p.id, p.payer_id, p.payee_id,
      case when p.created_at <= as_of - interval '72 hours' then 72 else 24 end as stage
    from public.payments p
    left join private.payment_reminders r on r.payment_id = p.id
    where p.state = 'due' and p.item_kind = 'bounty'
      and p.payer_id is not null and p.payee_id is not null
      and p.created_at <= as_of - interval '24 hours'
      and (r.hours is null or (r.hours < 72 and p.created_at <= as_of - interval '72 hours'))
    order by p.created_at
    for update of p skip locked
  loop
    begin
      insert into private.payment_reminders (payment_id, hours, sent_at) values (item.id, item.stage, as_of)
      on conflict (payment_id) do update set hours = excluded.hours, sent_at = excluded.sent_at;
      perform private.emit_event(array[item.payer_id], 'payment.reminder', item.id, item.payee_id);
      reminded := reminded + 1;
    exception when others then
      skipped := skipped + 1;
      raise warning 'payment % not reminded: % %', item.id, sqlstate, sqlerrm;
    end;
  end loop;
  return jsonb_build_object('reminded', reminded, 'skipped', skipped);
end;
$$;

create function public.run_payment_reminders() returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.run_payment_reminders(now());
$$;

revoke all on function private.run_payment_reminders(timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.run_payment_reminders() from public, anon, authenticated;
grant execute on function public.run_payment_reminders() to service_role;

-- Payments already past a mark when this ships count as reminded at it, so the first run sends no backlog.
insert into private.payment_reminders (payment_id, hours)
select p.id, case when p.created_at <= now() - interval '72 hours' then 72 else 24 end
from public.payments p
where p.state = 'due' and p.item_kind = 'bounty' and p.created_at <= now() - interval '24 hours';

select cron.schedule('payment-reminders', '*/10 * * * *', $$select public.run_payment_reminders()$$);

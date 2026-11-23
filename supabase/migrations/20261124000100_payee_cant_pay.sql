alter table public.payee_methods add column reported_at timestamptz;

-- The owner clears a report by changing the method's details or by stamping checked_at (「没问题」); a write that
-- sets reported_at itself is report_cant_pay's.
create function public.payee_methods_clear_report() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.reported_at is not null and new.reported_at is not distinct from old.reported_at and (
    new.checked_at is distinct from old.checked_at
    or (new.display_name, new.phone, new.bank_code, new.bank_name, new.account_number, new.qr_payload,
        new.acquirer_id, new.mcc, new.qr_name)
      is distinct from (old.display_name, old.phone, old.bank_code, old.bank_name, old.account_number,
        old.qr_payload, old.acquirer_id, old.mcc, old.qr_name)
  ) then
    new.reported_at := null;
  end if;
  return new;
end;
$$;

create trigger payee_methods_clear_report
  before update on public.payee_methods
  for each row execute function public.payee_methods_clear_report();

insert into private.event_kinds (kind, push) values ('payment.cant_pay', true);

-- A method already reported stays reported without a second push, so repeated taps never spam the payee.
create function public.report_cant_pay(payment uuid, method uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  reported timestamptz;
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer reports a method they cannot pay' using errcode = '42501';
  end if;
  if p.state <> 'due' then
    raise exception 'payment is not due' using errcode = '55000';
  end if;
  select m.reported_at into reported from public.payee_methods m
  where m.id = method and m.user_id = p.payee_id and m.type <> 'cash'
  for update;
  if not found then
    raise exception 'payee method not found' using errcode = 'P0002';
  end if;
  if reported is not null then
    return;
  end if;
  update public.payee_methods set reported_at = now() where id = method;
  perform private.emit_event(array[p.payee_id], 'payment.cant_pay', p.id, p.payer_id);
end;
$$;

revoke all on function public.report_cant_pay(uuid, uuid) from public, anon;
grant execute on function public.report_cant_pay(uuid, uuid) to authenticated;
revoke all on function public.payee_methods_clear_report() from public, anon, authenticated;

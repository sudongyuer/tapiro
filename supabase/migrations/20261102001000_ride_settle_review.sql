-- The payer names the amount they saw, so a share changed while the pay sheet was open is refused instead of being
-- marked paid at the new amount.
drop function public.mark_payment_paid(uuid, uuid, text);

create function public.mark_payment_paid(payment uuid, method uuid, expected_minor bigint, proof text default null)
returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  chosen public.payee_method_type;
  pay_currency char(3);
  pay_minor bigint;
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer marks a payment paid' using errcode = '42501';
  end if;
  if p.state <> 'due' then
    raise exception 'payment is not due' using errcode = '55000';
  end if;
  if expected_minor is distinct from p.amount_minor then
    raise exception 'amount_changed' using errcode = '55000';
  end if;
  select type into chosen from public.payee_methods
  where id = method and user_id = p.payee_id and type <> 'cash';
  if chosen is null then
    raise exception 'not a transfer method of the payee' using errcode = '22023';
  end if;
  pay_currency := public.method_currency(chosen, p.currency);
  pay_minor := private.convert_minor(
    p.amount_minor, p.currency, pay_currency, p.rate_base, p.rate_quote, p.rate_quote_per_base
  );
  if pay_minor is null then
    raise exception 'no_rate' using errcode = '55000';
  end if;
  if proof is not null and (
    split_part(proof, '/', 1) <> p.id::text
    or not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = proof)
  ) then
    raise exception 'proof is not an uploaded file of this payment' using errcode = '22023';
  end if;
  update public.payments
  set state = 'marked_paid', method_id = method, method_type = chosen, proof_path = proof,
      paid_minor = pay_minor, paid_currency = pay_currency, marked_paid_at = now(), nudged_at = null
  where id = p.id;
  perform public.log_payment_event(p.id, 'marked_paid', p.payer_id);
  return 'marked_paid';
end;
$$;

revoke all on function public.mark_payment_paid(uuid, uuid, bigint, text) from public, anon;
grant execute on function public.mark_payment_paid(uuid, uuid, bigint, text) to authenticated;

drop function public.ride_paid_states(uuid);

-- A ride closed by 到了 (Grab split, or nobody but the organiser on board) has no split, so an appeal confirmed later
-- boards the member into that settlement: they get their car sticker, and an organiser who rode alone gets theirs.
create function private.ride_appeal_sticker() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = new.ride_id;
  if r.status <> 'closed' or r.total_minor is not null then
    return new;
  end if;
  insert into public.stickers (owner_id, item_kind, item_id, role, title)
  values
    (new.member_id, 'ride', r.id, 'payer', private.ride_title(r)),
    (r.organiser_id, 'ride', r.id, 'payee', private.ride_title(r))
  on conflict (owner_id, item_id) where item_kind = 'ride' do nothing;
  return new;
end;
$$;

revoke all on function private.ride_appeal_sticker() from public, anon, authenticated;

create trigger ride_appeal_sticker
  after update of status on public.ride_members
  for each row
  when (old.status = 'appealed' and new.status = 'boarded')
  execute function private.ride_appeal_sticker();

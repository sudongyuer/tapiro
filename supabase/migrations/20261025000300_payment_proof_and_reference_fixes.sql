-- Two concurrent opens can draw the same free reference; the partial unique index decides, and the loser retries.
create or replace function public.open_payment(
  kind public.payment_item_kind,
  item uuid,
  item_title text,
  payer uuid,
  payee uuid,
  amount integer,
  reversing uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  violated text;
begin
  for attempt in 1..8 loop
    begin
      insert into public.payments (item_kind, item_id, title, payer_id, payee_id, amount_sen, reference, reverses)
      values (kind, item, item_title, payer, payee, amount, public.new_payment_reference(payee), reversing)
      returning id into new_id;
      perform public.log_payment_event(new_id, 'opened', null);
      return new_id;
    exception when unique_violation then
      get stacked diagnostics violated = constraint_name;
      if violated <> 'payments_unsettled_reference' then
        raise;
      end if;
    end;
  end loop;
  raise exception 'no free payment reference' using errcode = '23505';
end;
$$;

create or replace function public.mark_payment_paid(payment uuid, method uuid, proof text default null)
returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  chosen public.payee_method_type;
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer marks a payment paid' using errcode = '42501';
  end if;
  if p.state <> 'due' then
    raise exception 'payment is not due' using errcode = '55000';
  end if;
  select type into chosen from public.payee_methods
  where id = method and user_id = p.payee_id and type <> 'cash';
  if chosen is null then
    raise exception 'not a transfer method of the payee' using errcode = '22023';
  end if;
  if proof is not null and (
    split_part(proof, '/', 1) <> p.id::text
    or not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = proof)
  ) then
    raise exception 'proof is not an uploaded file of this payment' using errcode = '22023';
  end if;
  update public.payments
  set state = 'marked_paid', method_id = method, method_type = chosen, proof_path = proof,
      marked_paid_at = now(), nudged_at = null
  where id = p.id;
  perform public.log_payment_event(p.id, 'marked_paid', p.payer_id);
  return 'marked_paid';
end;
$$;

-- The payer removes a proof that is not attached (a draft, or one detached by undo) while the payment is due.
create policy payment_proofs_delete_payer on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-proofs' and exists (
      select 1 from public.payments p
      where p.id::text = (storage.foldername(name))[1]
        and p.payer_id = (select auth.uid())
        and p.state = 'due'
        and p.proof_path is distinct from storage.objects.name
    )
  );

drop function public.expired_payment_proofs();

-- Objects to remove: everything of a payment settled 30 days ago, and any object that is not the payment's
-- current proof once it is a few hours old (abandoned drafts, proofs detached by undo).
create function public.payment_proofs_to_delete(grace interval default interval '3 hours')
returns table (object_name text, payment_id uuid, clears_proof boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, p.id, o.name = p.proof_path
  from storage.objects o
  join public.payments p on p.id::text = split_part(o.name, '/', 1)
  where o.bucket_id = 'payment-proofs'
    and (
      (p.state = 'settled' and p.settled_at <= now() - interval '30 days')
      or (o.name is distinct from p.proof_path and o.created_at <= now() - grace)
    )
  union all
  select o.name, null, false
  from storage.objects o
  where o.bucket_id = 'payment-proofs'
    and o.created_at <= now() - grace
    and not exists (select 1 from public.payments p where p.id::text = split_part(o.name, '/', 1));
$$;

revoke all on function public.payment_proofs_to_delete(interval) from public, anon, authenticated;
grant execute on function public.payment_proofs_to_delete(interval) to service_role;

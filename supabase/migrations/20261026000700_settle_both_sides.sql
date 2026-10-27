create or replace function public.confirm_payment_received(payment uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
  helped integer;
  total integer;
begin
  if p.payee_id is distinct from (select auth.uid()) then
    raise exception 'only the payee confirms' using errcode = '42501';
  end if;
  if p.state = 'due' then
    if not exists (select 1 from public.payee_methods where user_id = p.payee_id and type = 'cash') then
      raise exception 'the payer has not marked it paid' using errcode = '55000';
    end if;
  elsif p.state <> 'marked_paid' then
    raise exception 'payment cannot be settled' using errcode = '55000';
  end if;
  update public.payments
  set state = 'settled', settled_at = now(), method_type = coalesce(method_type, 'cash')
  where id = p.id;
  perform public.log_payment_event(p.id, 'settled', p.payee_id);
  -- Serialises settles to one payee so concurrent settles return distinct counts and one first settle.
  perform pg_advisory_xact_lock(hashtextextended(p.payee_id::text, 0));
  if p.reverses is null then
    insert into public.stickers (owner_id, payment_id, role, item_kind, category, title)
    select side.owner_id, p.id, side.role, p.item_kind, p.category, p.title
    from (
      values (p.payee_id, 'payee'::public.sticker_role), (p.payer_id, 'payer'::public.sticker_role)
    ) as side (owner_id, role)
    where side.owner_id is not null
    on conflict (payment_id, owner_id) do nothing;
    perform private.record_settled(p.id);
    perform private.grant_help_settled(p.id);
  end if;
  select count(*) filter (where role = 'payee'), count(*) into helped, total
  from public.stickers where owner_id = p.payee_id;
  return jsonb_build_object(
    'state', 'settled',
    'firstSettled', p.reverses is null and helped = 1,
    'stickerCount', total
  );
end;
$$;

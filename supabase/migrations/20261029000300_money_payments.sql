-- Cash settles from due without mark_payment_paid, so a settle without a paid amount pays the item's own amount.
create or replace function public.payments_guard_amount() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.amount_minor <> old.amount_minor and old.state <> 'due' then
    raise exception 'the amount changes only while the payment is due' using errcode = '22023';
  end if;
  if (new.currency, new.rate_quote_per_base, new.rate_base, new.rate_quote, new.rate_date, new.rate_source)
    is distinct from (old.currency, old.rate_quote_per_base, old.rate_base, old.rate_quote, old.rate_date, old.rate_source)
  then
    raise exception 'the currency and the rate locked at open never change' using errcode = '22023';
  end if;
  if new.state = 'settled' and new.paid_minor is null then
    new.paid_minor := new.amount_minor;
    new.paid_currency := new.currency;
  end if;
  return new;
end;
$$;

drop function public.open_payment(
  public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid, public.bounty_category
);

-- Two concurrent opens can draw the same free reference; the partial unique index decides, and the loser retries.
create function public.open_payment(
  kind public.payment_item_kind,
  item uuid,
  item_title text,
  payer uuid,
  payee uuid,
  amount bigint,
  currency text,
  reversing uuid default null,
  item_category public.bounty_category default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked public.fx_rates := private.fresh_rate(open_payment.currency);
  new_id uuid;
  violated text;
begin
  for attempt in 1..8 loop
    begin
      insert into public.payments (
        item_kind, item_id, title, payer_id, payee_id, amount_minor, currency, rate_quote_per_base, rate_base,
        rate_quote, rate_date, rate_source, reference, reverses, category
      )
      values (
        kind, item, item_title, payer, payee, amount, open_payment.currency, locked.quote_per_base, locked.base,
        locked.quote, locked.rate_date, locked.source, public.new_payment_reference(payee), reversing, item_category
      )
      returning id into new_id;
      perform public.log_payment_event(new_id, 'opened', null);
      return new_id;
    exception when unique_violation then
      get stacked diagnostics violated = constraint_name;
      if violated = 'payments_one_forward_per_item' then
        raise exception 'payment_exists' using errcode = '23505';
      elsif violated <> 'payments_unsettled_reference' then
        raise;
      end if;
    end;
  end loop;
  raise exception 'no free payment reference' using errcode = '23505';
end;
$$;

revoke all on function public.open_payment(
  public.payment_item_kind, uuid, text, uuid, uuid, bigint, text, uuid, public.bounty_category
) from public, anon, authenticated;
grant execute on function public.open_payment(
  public.payment_item_kind, uuid, text, uuid, uuid, bigint, text, uuid, public.bounty_category
) to service_role;

create or replace function public.open_reverse_payment(original uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid public.payments;
begin
  select * into paid from public.payments where id = original for update;
  if not found or paid.state <> 'settled' then
    raise exception 'only a settled payment can be reversed' using errcode = '22023';
  end if;
  if paid.reverses is not null then
    raise exception 'a reverse payment cannot be reversed' using errcode = '22023';
  end if;
  return public.open_payment(
    paid.item_kind, paid.item_id, paid.title, paid.payee_id, paid.payer_id, paid.paid_minor, paid.paid_currency,
    paid.id
  );
end;
$$;

drop function public.set_payment_amount(uuid, integer);

create function public.set_payment_amount(payment uuid, amount bigint) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments set amount_minor = amount where id = payment;
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_payment_amount(uuid, bigint) from public, anon, authenticated;
grant execute on function public.set_payment_amount(uuid, bigint) to service_role;

create or replace function public.mark_payment_paid(payment uuid, method uuid, proof text default null)
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

create or replace function public.undo_marked_paid(payment uuid) returns public.payment_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments := public.locked_payment(payment);
begin
  if p.payer_id is distinct from (select auth.uid()) then
    raise exception 'only the payer undoes 我已付款' using errcode = '42501';
  end if;
  if p.state <> 'marked_paid' then
    raise exception 'payment is not marked paid' using errcode = '55000';
  end if;
  update public.payments
  set state = 'due', method_id = null, method_type = null, proof_path = null, paid_minor = null,
      paid_currency = null, marked_paid_at = null, nudged_at = null
  where id = p.id;
  perform public.log_payment_event(p.id, 'undone', p.payer_id);
  return 'due';
end;
$$;

-- A payer reads the payee's methods only while the payment is unsettled, as payee_methods_select_payer allows.
create function public.payment_detail(payment uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  p public.payments;
begin
  select * into p from public.payments where id = payment and uid in (payer_id, payee_id);
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'id', p.id,
    'amountMinor', p.amount_minor,
    'currency', p.currency,
    'rate', case when p.rate_base is not null then jsonb_build_object(
      'base', p.rate_base,
      'quote', p.rate_quote,
      'quotePerBase', p.rate_quote_per_base,
      'date', p.rate_date,
      'source', p.rate_source
    ) end,
    'paidMinor', p.paid_minor,
    'paidCurrency', p.paid_currency,
    'methods', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'method', m.id,
        'type', m.type,
        'currency', c.code,
        'amountMinor', private.convert_minor(
          p.amount_minor, p.currency, c.code, p.rate_base, p.rate_quote, p.rate_quote_per_base
        )
      ) order by m.created_at, m.id), '[]'::jsonb)
      from public.payee_methods m
      cross join lateral (select public.method_currency(m.type, p.currency) as code) c
      where m.user_id = p.payee_id and (uid = p.payee_id or p.state <> 'settled')
    )
  );
end;
$$;

revoke all on function public.payment_detail(uuid) from public, anon;
grant execute on function public.payment_detail(uuid) to authenticated;

drop function public.publish_bounty(
  uuid, text, public.bounty_category, integer, text, text, double precision, double precision, text, timestamptz,
  timestamptz, timestamptz
);

-- A replay of an id that is already published only returns the first answer when it carries the same content.
-- Different content under a published id means the client lost the first answer and the user edited the draft
-- afterwards; returning success would show content that is not what was stored.
create function public.publish_bounty(
  id uuid,
  title text,
  category public.bounty_category,
  reward_minor bigint,
  reward_currency text,
  description text default null,
  place_label text default null,
  latitude double precision default null,
  longitude double precision default null,
  address text default null,
  starts_at timestamptz default null,
  ends_at timestamptz default null,
  deadline_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  stored public.bounties;
  label text := nullif(btrim(publish_bounty.place_label), '');
  detail text := nullif(btrim(publish_bounty.address), '');
  charged text;
begin
  if publish_bounty.id is null then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  select * into stored from public.bounties b where b.id = publish_bounty.id;
  if not found then
    if (latitude is null) <> (longitude is null)
      or latitude not between -90 and 90
      or longitude not between -180 and 180
      or (latitude is null) <> (label is null)
      or (detail is not null and latitude is null)
      or publish_bounty.starts_at < now()
      or publish_bounty.ends_at < now()
      or publish_bounty.deadline_at < now()
      or publish_bounty.deadline_at > now() + interval '30 days'
      or publish_bounty.starts_at > now() + interval '30 days'
      or publish_bounty.deadline_at < publish_bounty.starts_at
    then
      raise exception 'invalid_bounty' using errcode = '22023';
    end if;
    if not private.within_post_limits('bounty', publish_bounty.reward_minor, publish_bounty.reward_currency)
      or not exists (
        select 1 from public.currencies c where c.code = publish_bounty.reward_currency and c.enabled
      )
    then
      raise exception 'invalid_reward' using errcode = '22023';
    end if;
    if public.publish_blocked() then
      raise exception 'publish_blocked' using errcode = '55000';
    end if;
    insert into public.bounties as b (
      id, poster_id, title, description, category, reward_minor, reward_currency, place, place_label, starts_at,
      ends_at, deadline_at, expires_at
    )
    values (
      publish_bounty.id, uid, btrim(publish_bounty.title), nullif(btrim(publish_bounty.description), ''),
      publish_bounty.category, publish_bounty.reward_minor, publish_bounty.reward_currency,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography, label,
      publish_bounty.starts_at, publish_bounty.ends_at, publish_bounty.deadline_at,
      coalesce(publish_bounty.deadline_at, now() + interval '7 days')
    )
    on conflict on constraint bounties_pkey do nothing
    returning * into stored;
    if found then
      if detail is not null then
        insert into public.bounty_addresses (bounty_id, address) values (stored.id, detail);
      end if;
      insert into public.bounty_events (bounty_id, kind, actor_id, to_status)
      values (stored.id, 'published', uid, 'open');
      charged := public.spend_post(uid, 'bounty', stored.id);
      return jsonb_build_object('id', stored.id, 'status', 'open', 'charge', charged, 'expiresAt', stored.expires_at);
    end if;
    select * into stored from public.bounties b where b.id = publish_bounty.id;
  end if;
  if stored.poster_id is distinct from uid then
    raise exception 'invalid_bounty' using errcode = '22023';
  end if;
  if stored.title is distinct from btrim(publish_bounty.title)
    or stored.category is distinct from publish_bounty.category
    or stored.reward_minor is distinct from publish_bounty.reward_minor
    or stored.reward_currency is distinct from publish_bounty.reward_currency
    or stored.description is distinct from nullif(btrim(publish_bounty.description), '')
    or stored.place_label is distinct from label
    or extensions.st_astext(stored.place) is distinct from extensions.st_astext(
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    )
    or (select a.address from public.bounty_addresses a where a.bounty_id = stored.id) is distinct from detail
    or stored.starts_at is distinct from publish_bounty.starts_at
    or stored.ends_at is distinct from publish_bounty.ends_at
    or stored.deadline_at is distinct from publish_bounty.deadline_at
  then
    raise exception 'post_already_sent' using errcode = '55000';
  end if;
  return jsonb_build_object(
    'id', stored.id,
    'status', stored.status,
    'charge', (select c.charge from public.post_charges c where c.item_kind = 'bounty' and c.item_id = stored.id),
    'expiresAt', stored.expires_at
  );
end;
$$;

revoke all on function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz
) to authenticated;

create or replace function private.confirm_bounty(bounty uuid, actor uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties := private.locked_bounty(bounty);
begin
  if not (b.status = 'done' or (b.status = 'disputed' and actor is not null)) then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.bounties set status = 'confirmed', status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
  values (bounty, case when actor is null then 'auto_confirmed' else 'confirmed' end::public.bounty_event_kind,
    actor, b.status, 'confirmed');
  return public.open_payment(
    'bounty', b.id, b.title, b.poster_id, b.helper_id, b.reward_minor, b.reward_currency, null, b.category
  );
end;
$$;

drop function public.active_bounties_of(uuid);

create function public.active_bounties_of(uid uuid) returns table (
  id uuid,
  title text,
  reward_minor bigint,
  reward_currency char(3),
  role text,
  counterpart_id uuid,
  status public.bounty_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.title,
    b.reward_minor,
    b.reward_currency,
    case when b.poster_id = uid then 'poster' else 'helper' end,
    case when b.poster_id = uid then b.helper_id else b.poster_id end,
    b.status
  from public.bounties b
  where (b.poster_id = uid or b.helper_id = uid)
    and b.status in ('assigned', 'en_route', 'done', 'disputed')
  order by b.status_changed_at, b.id;
$$;

revoke all on function public.active_bounties_of(uuid) from public, anon, authenticated;
grant execute on function public.active_bounties_of(uuid) to service_role;

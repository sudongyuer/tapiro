alter table public.bounties add column art text
  constraint bounties_art_slug check (art ~ '^[a-z][a-z0-9-]{0,31}$');

create function private.bounty_art(kind public.payment_item_kind, item uuid) returns text
language sql
stable
set search_path = ''
as $$
  select b.art from public.bounties b where bounty_art.kind = 'bounty' and b.id = bounty_art.item;
$$;

revoke all on function private.bounty_art(public.payment_item_kind, uuid) from public, anon, authenticated;

drop function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz
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
  deadline_at timestamptz default null,
  art text default null
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
      or publish_bounty.art !~ '^[a-z][a-z0-9-]{0,31}$'
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
      ends_at, deadline_at, expires_at, art
    )
    values (
      publish_bounty.id, uid, btrim(publish_bounty.title), nullif(btrim(publish_bounty.description), ''),
      publish_bounty.category, publish_bounty.reward_minor, publish_bounty.reward_currency,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography, label,
      publish_bounty.starts_at, publish_bounty.ends_at, publish_bounty.deadline_at,
      coalesce(publish_bounty.deadline_at, now() + interval '7 days'), publish_bounty.art
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
    or stored.art is distinct from publish_bounty.art
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
  timestamptz, timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.publish_bounty(
  uuid, text, public.bounty_category, bigint, text, text, text, double precision, double precision, text,
  timestamptz, timestamptz, timestamptz, text
) to authenticated;

-- A payer reads the payee's methods only while the payment is unsettled, as payee_methods_select_payer allows.
create or replace function public.payment_detail(payment uuid) returns jsonb
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
    'art', private.bounty_art(p.item_kind, p.item_id),
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

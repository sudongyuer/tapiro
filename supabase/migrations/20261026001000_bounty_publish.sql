create function public.publish_bounty(
  id uuid,
  title text,
  category public.bounty_category,
  reward_sen integer,
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
    if public.publish_blocked() then
      raise exception 'publish_blocked' using errcode = '55000';
    end if;
    insert into public.bounties as b (
      id, poster_id, title, description, category, reward_sen, place, place_label, starts_at, ends_at, deadline_at,
      expires_at
    )
    values (
      publish_bounty.id, uid, btrim(publish_bounty.title), nullif(btrim(publish_bounty.description), ''),
      publish_bounty.category, publish_bounty.reward_sen,
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
  return jsonb_build_object(
    'id', stored.id,
    'status', stored.status,
    'charge', (select c.charge from public.post_charges c where c.item_kind = 'bounty' and c.item_id = stored.id),
    'expiresAt', stored.expires_at
  );
end;
$$;

create function private.close_bounty(bounty uuid, why public.bounty_event_kind) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bounties;
begin
  if why is null or why not in ('closed', 'expired') then
    raise exception 'invalid_close' using errcode = '22023';
  end if;
  select * into b from public.bounties where id = bounty for update;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  if b.status <> 'open' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  update public.bounties set status = 'closed', status_changed_at = now() where id = bounty;
  insert into public.bounty_events (bounty_id, kind, actor_id, from_status, to_status)
  values (bounty, why, case when why = 'closed' then b.poster_id end, 'open', 'closed');
  return public.refund_post('bounty', bounty);
end;
$$;

create function public.close_bounty(bounty uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
  refunded text;
begin
  select * into b from public.bounties where id = bounty for update;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  if b.poster_id is distinct from uid then
    raise exception 'not_poster' using errcode = '42501';
  end if;
  if b.status = 'closed' and exists (
    select 1 from public.bounty_events where bounty_id = bounty and kind = 'closed' and actor_id = uid
  ) then
    refunded := (select charge::text from public.post_charges where item_kind = 'bounty' and item_id = bounty);
  else
    refunded := private.close_bounty(bounty, 'closed');
  end if;
  return jsonb_build_object('status', 'closed', 'refund', refunded);
end;
$$;

revoke all on function public.publish_bounty(
  uuid, text, public.bounty_category, integer, text, text, double precision, double precision, text, timestamptz,
  timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.close_bounty(uuid) from public, anon, authenticated;
revoke all on function private.close_bounty(uuid, public.bounty_event_kind) from public, anon, authenticated;

grant execute on function public.publish_bounty(
  uuid, text, public.bounty_category, integer, text, text, double precision, double precision, text, timestamptz,
  timestamptz, timestamptz
) to authenticated;
grant execute on function public.close_bounty(uuid) to authenticated;

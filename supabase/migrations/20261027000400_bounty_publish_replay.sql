-- A replay of an id that is already published only returns the first answer when it carries the same content.
-- Different content under a published id means the client lost the first answer and the user edited the draft
-- afterwards; returning success would show content that is not what was stored.
create or replace function public.publish_bounty(
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
  if stored.title is distinct from btrim(publish_bounty.title)
    or stored.category is distinct from publish_bounty.category
    or stored.reward_sen is distinct from publish_bounty.reward_sen
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

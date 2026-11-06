create type public.review_face as enum ('happy', 'okay', 'unhappy');
create type public.review_role as enum ('helper', 'poster', 'organiser', 'rider');

create table private.review_chips (
  role public.review_role not null,
  chip text not null check (chip ~ '^[a-z_]+$'),
  negative boolean not null,
  primary key (role, chip)
);

insert into private.review_chips (role, chip, negative)
values
  ('helper', 'on_time', false), ('helper', 'careful', false), ('helper', 'kept_posted', false),
  ('helper', 'extra_kind', false), ('helper', 'late', true), ('helper', 'no_heads_up', true),
  ('helper', 'unfinished', true), ('helper', 'item_damaged', true),
  ('poster', 'clear_ask', false), ('poster', 'paid_promptly', false), ('poster', 'easy_to_talk', false),
  ('poster', 'polite', false), ('poster', 'not_as_described', true), ('poster', 'slow_to_pay', true),
  ('poster', 'changed_ask', true), ('poster', 'rude', true),
  ('organiser', 'left_on_time', false), ('organiser', 'fair_split', false), ('organiser', 'clear_meetup', false),
  ('organiser', 'good_company', false), ('organiser', 'late', true), ('organiser', 'cancelled_late', true),
  ('organiser', 'wrong_fare', true), ('organiser', 'rude', true),
  ('rider', 'on_time', false), ('rider', 'paid_promptly', false), ('rider', 'good_company', false),
  ('rider', 'considerate', false), ('rider', 'late', true), ('rider', 'luggage_unmentioned', true),
  ('rider', 'slow_to_pay', true), ('rider', 'rude', true);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewee_id uuid not null references auth.users (id) on delete cascade,
  reviewee_role public.review_role not null,
  face public.review_face not null,
  chips text[] not null default '{}' check (cardinality(chips) <= 4),
  sentence text check (
    char_length(sentence) between 1 and 200
    and sentence = regexp_replace(sentence, '^[\s ​﻿]+|[\s ​﻿]+$', '', 'g')
  ),
  negative boolean not null,
  closes_at timestamptz not null,
  revealed_at timestamptz,
  -- A review is visible from shown_at on: when both sides have submitted, else when the 7-day window closes.
  shown_at timestamptz generated always as (coalesce(revealed_at, closes_at)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_kind, item_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index reviews_reviewee on public.reviews (reviewee_id, shown_at desc, id desc);
create index reviews_reviewer on public.reviews (reviewer_id);
create index reviews_unrevealed on public.reviews (closes_at) where revealed_at is null;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_replies (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (
    char_length(body) between 1 and 200
    and body = regexp_replace(body, '^[\s ​﻿]+|[\s ​﻿]+$', '', 'g')
  ),
  created_at timestamptz not null default now()
);

create index review_replies_author on public.review_replies (author_id);

alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
revoke all on public.reviews, public.review_replies from anon, authenticated;

create index stickers_ride_item on public.stickers (item_id) where item_kind = 'ride';

create function private.clean_review_text(t text) returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(t, '^[\s ​﻿]+|[\s ​﻿]+$', '', 'g'), '');
$$;

revoke all on function private.clean_review_text(text) from public, anon, authenticated;

-- Stickers are the settlement fact for both kinds: a bounty pair shares one payment's stickers; a ride pair is the
-- organiser and one boarded member, each holding the ride's car sticker. Riders never review each other (241 A).
create function private.review_pairs(uid uuid) returns table (
  item_kind public.payment_item_kind,
  item_id uuid,
  title text,
  counterpart_id uuid,
  counterpart_role public.review_role,
  opens_at timestamptz,
  closes_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'bounty'::public.payment_item_kind, p.item_id, p.title, theirs.owner_id,
    case theirs.role when 'payee' then 'helper' else 'poster' end::public.review_role,
    greatest(mine.earned_at, theirs.earned_at),
    greatest(mine.earned_at, theirs.earned_at) + interval '7 days'
  from public.stickers mine
  join public.stickers theirs on theirs.payment_id = mine.payment_id and theirs.owner_id <> mine.owner_id
  join public.payments p on p.id = mine.payment_id
  where mine.owner_id = uid and mine.item_kind = 'bounty' and p.item_kind = 'bounty' and p.reverses is null
  union all
  select 'ride'::public.payment_item_kind, r.id, mine.title, theirs.owner_id,
    case when theirs.owner_id = r.organiser_id then 'organiser' else 'rider' end::public.review_role,
    greatest(mine.earned_at, theirs.earned_at),
    greatest(mine.earned_at, theirs.earned_at) + interval '7 days'
  from public.stickers mine
  join public.rides r on r.id = mine.item_id
  join public.stickers theirs
    on theirs.item_kind = 'ride' and theirs.item_id = mine.item_id and theirs.owner_id <> mine.owner_id
  where mine.owner_id = uid and mine.item_kind = 'ride' and r.organiser_id in (mine.owner_id, theirs.owner_id);
$$;

revoke all on function private.review_pairs(uuid) from public, anon, authenticated;

create function private.person_json(person uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', p.id, 'name', p.display_name, 'avatarUrl', p.avatar_url)
  from public.profiles p where p.id = person;
$$;

revoke all on function private.person_json(uuid) from public, anon, authenticated;

create function private.review_json(v public.reviews) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id,
    'face', v.face,
    'chips', to_jsonb(v.chips),
    'sentence', v.sentence,
    'submittedAt', v.updated_at,
    'shownAt', case when v.shown_at <= now() then v.shown_at end,
    'reply', (
      select jsonb_build_object('body', x.body, 'createdAt', x.created_at)
      from public.review_replies x where x.review_id = v.id
    )
  );
$$;

revoke all on function private.review_json(public.reviews) from public, anon, authenticated;

create function private.review_pair_json(
  uid uuid,
  kind public.payment_item_kind,
  item uuid,
  counterpart uuid,
  role public.review_role,
  closes timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mine public.reviews;
  theirs public.reviews;
begin
  select * into mine from public.reviews v
  where v.item_kind = kind and v.item_id = item and v.reviewer_id = uid and v.reviewee_id = counterpart;
  select * into theirs from public.reviews v
  where v.item_kind = kind and v.item_id = item and v.reviewer_id = counterpart and v.reviewee_id = uid;
  return jsonb_build_object(
    'kind', kind,
    'itemId', item,
    'counterpart', private.person_json(counterpart),
    'role', role,
    'closesAt', closes,
    'state', case
      when mine.id is not null and mine.shown_at <= now() then 'revealed'
      when mine.id is not null then 'sealed'
      when now() < closes then 'open'
      else 'ended'
    end,
    'theyReviewed', theirs.id is not null,
    'mine', case when mine.id is not null then
      private.review_json(mine) || jsonb_build_object('editable', mine.shown_at > now())
    end,
    'theirs', case when theirs.id is not null and theirs.shown_at <= now() then private.review_json(theirs) end
  );
end;
$$;

revoke all on function private.review_pair_json(uuid, public.payment_item_kind, uuid, uuid, public.review_role, timestamptz)
  from public, anon, authenticated;

create function public.review_state(kind public.payment_item_kind, item uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    private.review_pair_json((select auth.uid()), x.item_kind, x.item_id, x.counterpart_id, x.counterpart_role, x.closes_at)
    order by x.counterpart_role, x.opens_at, x.counterpart_id
  ), '[]'::jsonb)
  from private.review_pairs((select auth.uid())) x
  where x.item_kind = kind and x.item_id = item;
$$;

revoke all on function public.review_state(public.payment_item_kind, uuid) from public, anon;
grant execute on function public.review_state(public.payment_item_kind, uuid) to authenticated;

create function public.pending_reviews() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'kind', x.item_kind,
      'itemId', x.item_id,
      'title', x.title,
      'counterpart', private.person_json(x.counterpart_id),
      'role', x.counterpart_role,
      'closesAt', x.closes_at,
      'theyReviewed', exists (
        select 1 from public.reviews t
        where t.item_kind = x.item_kind and t.item_id = x.item_id
          and t.reviewer_id = x.counterpart_id and t.reviewee_id = (select auth.uid())
      )
    )
    order by x.closes_at, x.item_id, x.counterpart_id
  ), '[]'::jsonb)
  from private.review_pairs((select auth.uid())) x
  where x.closes_at > now()
    and not exists (
      select 1 from public.reviews m
      where m.item_kind = x.item_kind and m.item_id = x.item_id
        and m.reviewer_id = (select auth.uid()) and m.reviewee_id = x.counterpart_id
    );
$$;

revoke all on function public.pending_reviews() from public, anon;
grant execute on function public.pending_reviews() to authenticated;

create function public.submit_review(
  kind public.payment_item_kind,
  item uuid,
  reviewee uuid,
  face public.review_face,
  chips text[] default '{}',
  sentence text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  pair record;
  picked text[] := coalesce(chips, '{}');
  cleaned text := private.clean_review_text(sentence);
  has_negative boolean;
  existing public.reviews;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into pair from private.review_pairs(uid) x
  where x.item_kind = kind and x.item_id = item and x.counterpart_id = reviewee;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  -- Both directions of one pair take the same lock, so two last submits cannot both miss each other's review.
  perform pg_advisory_xact_lock(hashtextextended(
    'review:' || kind::text || ':' || item::text || ':' || least(uid, reviewee)::text || ':'
      || greatest(uid, reviewee)::text,
    0
  ));
  if now() >= pair.closes_at then
    raise exception 'review_closed' using errcode = '55000';
  end if;
  if face is null
    or cardinality(picked) > 4
    or array_position(picked, null) is not null
    or cardinality(picked) <> (select count(distinct c) from unnest(picked) c)
    or exists (
      select 1 from unnest(picked) c
      left join private.review_chips k on k.role = pair.counterpart_role and k.chip = c
      where k.chip is null or k.negative is distinct from (face <> 'happy')
    )
    or char_length(cleaned) > 200
  then
    raise exception 'invalid_review' using errcode = '22023';
  end if;
  has_negative := cardinality(picked) > 0 and face <> 'happy';
  select * into existing from public.reviews v
  where v.item_kind = kind and v.item_id = item and v.reviewer_id = uid and v.reviewee_id = reviewee
  for update;
  if found and existing.shown_at <= now() then
    raise exception 'review_locked' using errcode = '55000';
  end if;
  if existing.id is null then
    insert into public.reviews (
      item_kind, item_id, reviewer_id, reviewee_id, reviewee_role, face, chips, sentence, negative, closes_at
    )
    values (kind, item, uid, reviewee, pair.counterpart_role, face, picked, cleaned, has_negative, pair.closes_at);
  else
    update public.reviews v
    set face = submit_review.face, chips = picked, sentence = cleaned, negative = has_negative
    where v.id = existing.id;
  end if;
  update public.reviews v set revealed_at = now()
  where v.item_kind = kind and v.item_id = item and v.revealed_at is null
    and ((v.reviewer_id = uid and v.reviewee_id = reviewee) or (v.reviewer_id = reviewee and v.reviewee_id = uid))
    and exists (
      select 1 from public.reviews t
      where t.item_kind = kind and t.item_id = item and t.reviewer_id = reviewee and t.reviewee_id = uid
    );
  return private.review_pair_json(uid, kind, item, reviewee, pair.counterpart_role, pair.closes_at);
end;
$$;

revoke all on function public.submit_review(
  public.payment_item_kind, uuid, uuid, public.review_face, text[], text
) from public, anon;
grant execute on function public.submit_review(
  public.payment_item_kind, uuid, uuid, public.review_face, text[], text
) to authenticated;

create function public.reply_to_review(review uuid, body text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v public.reviews;
  cleaned text := private.clean_review_text(body);
  stored public.review_replies;
begin
  select * into v from public.reviews r where r.id = review for update;
  if not found or v.reviewee_id is distinct from uid or v.shown_at > now() then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  if cleaned is null or char_length(cleaned) > 200 then
    raise exception 'invalid_reply' using errcode = '22023';
  end if;
  select * into stored from public.review_replies x where x.review_id = review;
  if found then
    if stored.body = cleaned then
      return jsonb_build_object('reviewId', review, 'body', stored.body, 'createdAt', stored.created_at);
    end if;
    raise exception 'already_replied' using errcode = '55000';
  end if;
  insert into public.review_replies (review_id, author_id, body) values (review, uid, cleaned)
  returning * into stored;
  return jsonb_build_object('reviewId', review, 'body', stored.body, 'createdAt', stored.created_at);
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

create function public.reveal_due_reviews(as_of timestamptz default now()) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  revealed integer;
begin
  update public.reviews v set revealed_at = v.closes_at
  where v.revealed_at is null and v.closes_at <= as_of;
  get diagnostics revealed = row_count;
  return revealed;
end;
$$;

revoke all on function public.reveal_due_reviews(timestamptz) from public, anon, authenticated;
grant execute on function public.reveal_due_reviews(timestamptz) to service_role;

select cron.schedule('reviews-reveal', '*/10 * * * *', $$select public.reveal_due_reviews()$$);
